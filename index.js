const Discord = require("discord.js");
const bot = new Discord.Client({"disableEveryone": true});
const config = require("./config.json");
const utill = require('util');
const terminal = require('node-cmd');
const csv = require('csv-parser');
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const lodash = require('lodash');


/**
 * I/O Discord Bot. Create team formations from a formation form.
 * 
 * 
 * @author Daniel Dawit and Thomas Dawit
 * 
 */
  const csvFileName = "Users";
  const csvPath = csvFileName + ".csv";
  const teamcounterFileName = "./teamcounter.json";
  const teamcounter = require(teamcounterFileName);
  const currentTeamCount = teamcounter.virtualCounter;



bot.on("ready", () => {
    console.log("Ready");
});

/**
Runs whenever a user joins a discord server
@params member the member that joined
@requires the path to the csv file to be valid
@ensures it is read
**/
bot.on("guildMemberAdd", (member) => {

    fs.createReadStream(csvPath)//create a stream that reads the file
        .pipe(csv())//pipe it as a csv format
        .on('data', (row) => {//when a row is formatted, we run this block. The row is defined as 'row'
            console.log(row);
            if (row["confirmation.discordUsername"])
            {
                //setup user
                console.log("New user confirmed");
                //add permissions here
                return;
            }

        })
        .on('end', () => {//when the file is done being read this runs
            //say they're not a registered user
            console.log("User is not a registered user");
        });

});


const prefix = config.prefix;
const cooldown = {};

//Participant focused IDs
const teamAssignedID = "892527519939584061";
const participantID = "892527519939584062";
const verifiedChannelID = "892527520212201508";
const archiveCategoryID = "892527520736505915";

//Misc IDs
const organizerID = "892527519939584069";
const mentorID = "892527519939584065";
const eClubID = "892527519939584067";
const sponsorID = "892527519939584066";
const judgeID = "892527519939584064";

//Name of the column that contains the discord user name and the users email
const discordUsernameColName = "confirmation.discord";
const emailColName = "email";
const signatureLiabilityColName = "confirmation.signatureLiability"

//Message that sends if not in records
const doesNotExist = "Your discord username is not attached to our records. Please try"+
" again with the discord account you registered with or contact an organizer. " +
 "If you are verifying your account under 24 hours from your confirmation, please wait" +
 " until 24 hours have passed and try again."


 function writeToJsonKey(fileName, keyName, value){
    let fullpath = PATH.resolve(GETPATH, fileName);
    let rawdata = fs.readFileSync(fullpath,'utf8');
    console.log(rawdata) //returns data as per json and is of string type
    
    const data = JSON.parse(rawdata); 
    lodash.set(data, keyName, value );
  
    
    fs.writeFileSync(fullpath, JSON.stringify(data, null, 2), function (err) { 
        if (err) throw err;
        console.log('Saved!');
      });
}

/*
* Bot commands.
*/
bot.on("message", async message => {

    //ignores dms
    if (message.channel.type == "dm" || message.author.bot) return;

    //gets the name of the command used
    let command = message.content.split(" ")[0];
    let args = message.content.substring(command.length + 1).split(" ");

    /*
    * Verification command
    */
    if (command == prefix + "verify") {
        //If we are in the verify channel
        if (message.channel.id == verifiedChannelID) {
            let discordUsernameExists = false;
            message.delete({timeout: 0});
            /*
            * Create read stream to confirm the users status
            */
            fs.createReadStream(csvPath)//create a stream that reads the file
                .pipe(csv())//pipe it as a csv format
                .on('data', (row) => {//when a row is formatted, we run this block. The row is defined as 'row'
                   
                if (row[discordUsernameColName] == message.author.tag) {
                        discordUsernameExists = true;
                        message.author.send("Please enter the email that you confirmed with from registration").then(async m => {

                            const filter = m => m.author.id == message.author.id;
                            const collector = m.channel.createMessageCollector(filter);

                            collector.on('collect', msg => {
                                
                                if (msg.content == row[emailColName]) {
                                    message.author.send("Profile verified. You now have access to the discord server. Head to the team formation channel to start meeting other participants and create your team. Refer back to the #start-here channel for detailed instructions.");
                                    message.member.roles.add(participantID);
                                    collector.stop();
                                } else {
                                    message.author.send("Could not verify your email. Please try again or contact an organizer");
                                }

                            });

                        });
                        return;
                    }

                })
                .on('end', () => {//when the file is done being read this runs
                    if (!discordUsernameExists)
                        //Sends message to user if record does not exist
                        message.author.send(doesNotExist);
                });
        } else {
            //Delete if command is used elsewhere
            message.delete({timeout: 0});
        }
    }


    /*
    * Create virtual team command
    */
    if (command == prefix + "createteam") {
        //Check if member is a participant
        if (message.member._roles.some(i => i == participantID)) {
            //Check if command was used recently
            if (cooldown[message.author.id] != null && cooldown[message.author.id] > new Date().getTime()) {
                message.reply("You cannot create a team at this moment. You have recently used this command within the last 5 minutes");
                return;
            }
            cooldown[message.author.id] = new Date() + 300000;
            let indx = message.content.indexOf("\"") + 1;
            let indx2 = message.content.indexOf("\"", indx);
            let teamName = message.content.substring(indx, indx2);//finds the team name
            teamName = teamName.substring(0, 52);//makes sure it is less than 52 characters and above 3

            //Checks for illegal characters
            if (teamName.length == 1 && ",.<>?/;:'\"[{]}=+~`!@#$%^&*()".split("").some(i => teamName.includes(i))) {
                return message.channel.send("Illegal characters in your team name");
            }

            //Checks if teamname already exists
            let bool1 = true;
            message.guild.roles.cache.forEach(i => {
                if (i.name.toLowerCase() == teamName.toLowerCase()) {
                    bool1 = false;
                    return message.channel.send("This team name already exists");
                }
            });
            //Second catch
            if (!bool1) return;


            let mentions = message.mentions.users.map(i => message.guild.members.cache.get(i.id)).filter(i => i.id != message.author.id)
            const teamAssigned = teamAssignedID;
            const participants = participantID;

            //Checks for valid parameters (members that are @'ed)
            if (mentions.length > 0 && mentions.length < 4) {
                mentions.push(message.member);

                
                //Checks if member is already in a team
                if (message.member.roles.cache.has(teamAssigned)) {
                    message.reply("You cannot create a team as you are already in one. Please leave a team first.");
                    return;
                } else {
                   // message.member.roles.add(message.guild.roles.cache.get(teamAssigned));
                }
                
                //For each person in the mentioned paramters
                //TODO: Create functionality to allow members to choose to join
                for (let person of mentions) {
                    if(person.roles.cache.has(participants)){
                        if (person._roles.some(i => i == teamAssigned)) {
                            // if(person.id == message.author.id){
                            //     message.reply(person.user.username + ", you cannot add yourself as another team member");
                            //     return;
                            // }
                            message.reply(person.user.username + " cannot be added to another team");
                            return;
                        } else {
                           // person.roles.add(message.guild.roles.cache.get(teamAssigned));
                        }
                    } else {
                        message.reply(person.user.username + " cannot be added to another team because they are not a participant");
                        return;
                    }
                }

                message.member.roles.add(message.guild.roles.cache.get(teamAssigned));
                for(let person of mentions){
                    person.roles.add(message.guild.roles.cache.get(teamAssigned));
                }


                cooldown[message.member.id] = new Date().getTime() + 300000;
                let role = await message.guild.roles.create({
                    data: {//makes the role
                        name: teamName,
                        color: "#d1f6fc"
                    },
                    reason: "New Team Created"
                });

                //Messages channel the team is created
                message.channel.send("Team " + teamName + " created. View your channels below.")

                mentions.forEach(i => {
                    i.roles.add(role.id);//adds member to the role
                });

                
                //Creates team category
                let category = await message.guild.channels.create("Team " + currentTeamCount + " - " + teamName, {
                    type: "category",
                    permissionOverwrites: [
                        {
                            id: message.guild.roles.everyone.id,
                            deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: role.id,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: mentorID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: eClubID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: sponsorID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: judgeID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },

                    ]

                });
                await category.setPosition(message.guild.channels.cache.size - 1);

                //Creates team text channel
                let newTextChannel = await message.guild.channels.create(teamName + "-text", {
                    type: "text",
                    permissionOverwrites: [
                        {
                            id: message.guild.roles.everyone.id,
                            deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: role.id,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: mentorID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: eClubID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: sponsorID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                        {
                            id: judgeID,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        },
                    ]
                });

                await newTextChannel.setParent(category.id, {lockPermissions: false});

                //Creates team voice channel
                let newVoiceChannel = await message.guild.channels.create(teamName + "-voice", {
                    type: "voice",
                    permissionOverwrites: [
                        {
                            id: message.guild.roles.everyone.id,
                            deny: ["VIEW_CHANNEL"]
                        },
                        {
                            id: role.id,
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                        },
                        {
                            id: mentorID,
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                        },
                        {
                            id: eClubID,
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                        },
                        {
                            id: sponsorID,
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                        },
                        {
                            id: judgeID,
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                        },
                    ]
                });
                await newVoiceChannel.setParent(category.id, {lockPermissions: false});

                writeToJsonKey(teamcounterFileName, teamcounter.virtualCounter, teamcounter.virtualCounter++);


                // teamcounter.virtualCounter = teamcounter.virtualCounter++;
                // //Update team counter and write to file
                // fs.writeFile(teamcounterFileName, JSON.stringify(teamcounterFileName, null, 2), function writeJSON(err) {
                //     if (err) return console.log(err);
                //     console.log(JSON.stringify(teamcounter));
                //     console.log('writing to ' + teamcounterFileName);
                //   });
                //   console.log(JSON.stringify(teamcounter));

            } else {
                message.channel.send("Your team must be between 2 to 4 people");
            }
        } else {
            message.channel.send("You do not have access to this command").then(r => r.delete({timeout: 10000}));
        }
    }

  
    // in person team creation (already have a number)
    // 

    // virtual team creation (assign a number)
    // 600, 601
    

    //add member to a team. o.addmember "teamname" @[invite] 
    /*
    * Add member command - Invites between 1-3 depending on size
    */
    if (command == prefix + "addmember") {
        
        const teamAssigned = teamAssignedID;
        const participant = participantID;
        const maxInTeam = 4;
        //let member = message.mentions.first();
        //mentions
        let mentions = message.mentions.members;

        //team name
        let indx = message.content.indexOf("\"") + 1;
        let indx2 = message.content.indexOf("\"", indx);
        let teamName = message.content.substring(indx, indx2);//finds the team name
        teamName = teamName.substring(0, 52);

        let role = message.guild.roles.cache.find(i => i.name == teamName);
        if(role != null && message.member.roles.cache.has(role.id)){
        let numPeopleInRole = role.members.size;
        

        if(mentions != null && (mentions.size + numPeopleInRole <= maxInTeam)){
            mentions.forEach(i => {
                if(i.roles.cache.has(participant) && !(i.roles.cache.has(teamAssigned))){
                    i.roles.add(role.id);
                    i.roles.add(teamAssigned);
                    message.channel.send("<@"+ i + "> was added to your team.");
                } else {
                    message.channel.send("Cannot add " + i.nickname);
                }
                
            });
        }else{
            message.channel.send("Cannot add member, too many in team or not enough invites");
            return;
        }

    }else{
        message.channel.send("You cannot add members to this team.");
    }
    }

    /*
    * Leave team command
    */
    if (command == prefix + "leaveteam") {

        
        let role = message.member.roles.cache.find(i => {
            args = args.map(j => j.replace("\"", ""));
            return i.name == args.join(" ");
        });

        if (role != null) {
            await message.member.roles.remove(role);//removes person from role
            message.member.roles.remove(teamAssignedID);
            message.channel.send("You have left your team.");

            let numPeopleInRole = role.members.size;

            if (numPeopleInRole == 0) {
               let category = message.guild.channels.cache.find(i => i.name == "Team " + role.name)
               // message.guild.channels.cache.forEach(i => {
                  //  if (i.name == "Team " + role.name) {
                      if(category != null){
                        category.children.forEach(j => {
                            if (j.type == "voice")
                                j.delete();
                            else j.setParent(archiveCategoryID);
                        });
                        category.delete();
                        role.delete();
                    }
               // });
            }

        } else {
            message.reply("you are not apart of this team");
        }



    }

    /*
    * Print names command - Organizers only
    */
    if (command == prefix + "printnames") {
        message.delete({timeout: 0});
        if (message.member._roles.some(i => i == organizerID)) {
            message.author.send("\n------Verified Participants in Discord------\n")
            const count = 0;
            
            fs.createReadStream(csvPath)//create a stream that reads the file
                .pipe(csv())//pipe it as a csv format
                .on('data', (row) => {//when a row is formatted, we run this block. The row is defined as 'row'
                    //if (row["confirmation.discordUsername"] == message.author.tag) {
                        let userName = row[discordUsernameColName];
                        let person = message.guild.members.cache.find(i => i.user.tag === userName);

                        if(person != null && person._roles.some(i => i == participantID)){
                            message.author.send(row[signatureLiabilityColName] + ", " + userName); 
                        }

                        })
                .on('end', () => {//when the file is done being read this runs
                        message.author.send("------ Finished ------\n");
                        //message.author.send("Total Verified Users: " + count);
                    //say they're not a registered user
                    //message.member.send("Hey you need to confirm")
                });


        } else {
            message.channel.send("You do not have access to this command").then(r => r.delete({timeout: 10000}));
        }
    }

    //Parses Strings to code and outputs it
    if (command == prefix + "e") {

        if (!args[0]) return message.channel.send("Please input something to execute");
        if (args.join(' ').includes('token')) return message.channel.send('nahh who do u think u are?');
        let msg = await message.channel.send("Attempting to evaluate...");
        if (args[0].toLowerCase() == 'bash') {
            let hrDiff;
            const hrStart = process.hrtime();
            terminal.get(args.slice(1).join(' '), async (err, data) => {
                hrDiff = process.hrtime(hrStart);
                if (err) return msg.edit(`Error while evaluating: \`${ err }\``);
                msg.edit(`\`\`\`md\n${ data.length >= 2000 ? data.substr(0, 1996) + "..." : data }\`\`\``);
            });
        } else {
            let result, hrDiff, dm;
            try {
                const hrStart = process.hrtime();
                if (args[0] === '--dm') {args.shift(); dm = true;}
                let content = args.join(' ');
                result = await (async (x = eval(content)) => x instanceof Promise ? await x : x)();
                hrDiff = process.hrtime(hrStart);
            } catch (err) {
                return msg.edit(`Error while evaluating: \`${ err }\``);
            }

            let inspected = utill.inspect(result, {depth: 0});
            if (inspected.length >= 1024) inspected = inspected.substring(1020) + "...";
            let embed = new Discord.MessageEmbed()
                .setAuthor(`Evaluation in ${ hrDiff[0] > 0 ? `${ hrDiff[0] }s ` : '' }${ hrDiff[1] / 1000000 }ms.`)
                .setColor("#36393F")
                .addField("Input", `\`\`\`\n${ args.join(' ') }\`\`\``)
                .addField("Output", `\`\`\`js\n${ inspected }\`\`\``)
                .setFooter("Click the ❌ to remove this message. 30 seconds if needed!");
            let links = inspected.match(/https?:\/\/.*?\..*/);
            if (links) embed.addField('Here are the links:', links);

            if (dm) {
                await msg.edit(`I've sent you the response in your direct messages`);
                return message.author.send(embed);
            } else return msg.edit(embed);
        }


    }

});


bot.login(config.token);