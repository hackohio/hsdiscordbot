const Discord = require("discord.js");
const bot = new Discord.Client({"disableEveryone": true});
const config = require("./config.json");
const setup = require("./setup.json");
const errormsg = require("./errormsg.json");
const utill = require('util');
const terminal = require('node-cmd');
const csv = require('csv-parser');
const fs = require('fs');
//const path = require('objects-to-csv')
const readline = require('readline');
const {google} = require('googleapis');
//const lodash = require('lodash');
//const { CsvWriter } = require("csv-writer/src/lib/csv-writer"); //npm i csv-writer
const { CsvWriter } = require("csv-writer"); //npm i csv-writer


/**
 * I/O Discord Bot. Create team formations from a formation form.
 * 
 * 
 * @author Daniel Dawit and Thomas Dawit
 * 
 */
  //Constants for csv setup, file names
  const csvExtension = setup.csvPath;
  const csvFileName = setup.csvFileNameParticipant;
  const csvFileNameMentor = setup.csvFileNameMentor;

  //Path names
  const csvPath = csvFileName + csvExtension;
  const csvPathMentor = csvFileNameMentor + csvExtension;

  //In person/ team counts
  const teamcounterFileName = setup.teamcounterFileName;
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

//Participant/channel focused IDs
const teamAssignedID = setup.teamAssignedID;
const participantID = setup.participantID;
const verifiedChannelID = setup.verifiedChannelID;
const archiveCategoryID = setup.archiveCategoryID;

//Misc role IDs
const organizerID = setup.organizerID;
const mentorID = setup.mentorID;
const eClubID = setup.eClubID;
const sponsorID = setup.sponsorID;
const judgeID = setup.judgeID;

//Name of the column that contains the discord user name and the users email
const discordUsernameColName = setup.discordUsernameColNameParticipant;
const emailColName = setup.emailColNameParticipant;
const signatureLiabilityColName = setup.signatureLiabilityColNameParticipant;

const discordUsernameColNameMentor = setup.discordUsernameColNameMentor;
const emailColNameMentor = setup.emailColNameMentor;
const signatureLiabilityColNameMentor = setup.signatureLiabilityColNameMentor;

//Message that sends if not in records
const doesNotExist = errormsg.doesNotExist;

/*
* Reads json files
*/
 function jsonReader(filePath, cb) {
    fs.readFile(filePath, (err, fileData) => {
      if (err) {
        return cb && cb(err);
      }
      try {
        const object = JSON.parse(fileData);
        return cb && cb(null, object);
      } catch (err) {
        return cb && cb(err);
      }
    });
  }

/*
* Bot commands.
*/
bot.on("message", async message => {

    //ignores direct messages or messages from bots
    if (message.channel.type == "dm" || message.author.bot) return;

    //gets the name of the command used
    let command = message.content.split(" ")[0];
    let args = message.content.substring(command.length + 1).split(" ");

    /*
    * Verification command for participants 
    * o.part
    */
    if (command == prefix + "part") {

        //If we are in the verify channel
        if (message.channel.id == verifiedChannelID) {
            let discordUsernameExists = false;
            message.delete({timeout: 0});
            //Check if csv file exists
            if (!fs.existsSync(csvPath)) {
                console.log('Participant Directory not found.');
                return;
            }  
            /*
            * Create read stream to confirm the users status
            */
            fs.createReadStream(csvPath)//create a stream that reads the file
                .pipe(csv())//pipe it as a csv format
                .on('data', (row) => {//when a row is formatted, we run this block. The row is defined as 'row'
                   //console.log(message.author.tag);
                   //console.log(row[confirmation.discord]);
                if (row[discordUsernameColName] == message.author.tag) {
                        discordUsernameExists = true;
                        
                        try{
                        message.author.send(errormsg.emailAsk).then(async m => {

                            const filter = m => m.author.id == message.author.id;
                            const collector = m.channel.createMessageCollector(filter);

                            collector.on('collect', msg => {
                                
                                if (msg.content == row[emailColName]) {
                                    message.author.send(errormsg.profileVerifiedParticipant);
                                    message.member.roles.add(participantID);
                                    collector.stop();
                                } else {
                                    message.author.send(errormsg.couldNotVerifyEmail);
                                }

                            });

                        });
                        } catch(error){
                            message.channel.send(errormsg.dmsDisabledMsg)
                        }
                        return;
                    }

                })
                .on('end', () => {//when the file is done being read this runs
                    if (!discordUsernameExists)
                    try{
                        //Sends message to user if record does not exist
                        message.author.send(doesNotExist);
                    } catch(error){
                        message.channel.send(errormsg.dmsDisabledMsg)
                    }
                });
        } else {
            //Delete if command is used elsewhere
            message.delete({timeout: 0});
        }
    }

    /*
    *  Verification command for mentors 
    *  o.ment
    */
    if (command == prefix + "ment") {
         
        //If we are in the verify channel
        if (message.channel.id == verifiedChannelID) {
            let discordUsernameExists = false;
            message.delete({timeout: 0});
            //Check if csv file exists
            if (!fs.existsSync(csvPathMentor)) {
                console.log('Mentor Directory not found.');
                return;
            }       
            /*
            * Create read stream to confirm the users status
            */
            fs.createReadStream(csvPathMentor)//create a stream that reads the file
                .pipe(csv())//pipe it as a csv format
                .on('data', (row) => {//when a row is formatted, we run this block. The row is defined as 'row'
                   //console.log(message.author.tag);
                   //console.log(row[confirmation.discord]);
                if (row[discordUsernameColNameMentor] == message.author.tag) {
                        discordUsernameExists = true;
                        
                        try{
                            //Ask for email
                        message.author.send(errormsg.emailAsk).then(async m => {

                            const filter = m => m.author.id == message.author.id;
                            const collector = m.channel.createMessageCollector(filter);

                            collector.on('collect', msg => {
                                
                                if (msg.content == row[emailColNameMentor]) {
                                    //Assign judge/mentor role
                                    const roleAssign = mentorID;
                                    try{
                                        message.author.send(errormsg.judgementorDistinguish).then(async m2 => {
                                            const filter2 = m2 => m2.author.id == message.author.id;
                                            const collector2 = m2.channel.createMessageCollector(filter2);
                                            collector2.on('collect', msg2 => {
                                                switch (msg2.content){
                                                    case "1":
                                                        roleAssign = mentorID;
                                                        break;
                                                    case "2":
                                                        roleAssign = judgeID;
                                                        break;
                                                    case "3":
                                                        roleAssign = "3"
                                                        break;
                                                    default:
                                                        roleAssign = mentorID;
                                                        break;
                                                }
                                            });
                                            collector2.stop();
                                        });
                                    } catch(error){
                                        message.channel.send(errormsg.dmsDisabledMsg);
                                    }
                                   
                                    //errormsg.judgementorDistinguish
                                    message.author.send(errormsg.profileVerifiedMentor);
                                    message.member.roles.add(roleAssign);
                                    if(roleAssign == "3"){
                                        message.member.roles.add(judgeID);
                                    }
                                    collector.stop();


                                } else {
                                    message.author.send(errormsg.couldNotVerifyEmail);
                                }

                            });

                        });
                        } catch(error){
                            message.channel.send(errormsg.dmsDisabledMsg);
                        }
                        return;
                    }

                })
                .on('end', () => {//when the file is done being read this runs
                    if (!discordUsernameExists)
                    try{
                        //Sends message to user if record does not exist
                        message.author.send(errormsg.doesNotExist);
                    } catch(error){
                        message.channel.send(errormsg.dmsDisabledMsg)
                    }
                });
        } else {
            //Delete if command is used elsewhere
            message.delete({timeout: 0});
        }
    }
    /*
    * Create team command
    * o.createteam [teamname] @[user]
    */
    if (command == prefix + "createteam") {
        //Check if member is a participant
        if (message.member._roles.some(i => i == participantID)) {
            //Check if command was used recently
            if (cooldown[message.author.id] != null && cooldown[message.author.id] > new Date().getTime()) {
                message.reply(errormsg.createteamCooldown);
                return;
            }
            cooldown[message.author.id] = new Date() + 300000;

            //Extract team name
            let indx = message.content.indexOf("[") + 1;
            let indx2 = message.content.indexOf("]", indx);
            let teamName = message.content.substring(indx, indx2);//finds the team name
            teamName = teamName.substring(0, 52);//makes sure it is less than 52 characters and above 3

            //Extract table number (in person only)
            let indxTN = message.content.indexOf("[", indx2+ 1) ;
            let indxTN2 = message.content.indexOf("]", indxTN);
            let inPerson = !(indxTN < 0); //Determines if in person team
            var teamNumber;
            
            //Assigns teamNumber based on in person status
            if(inPerson){
                let teamNumberString = message.content.substring(indxTN+ 1, indxTN2)
                console.log(teamNumberString);
                teamNumber = parseInt(teamNumberString);
            } else {
                teamNumber = teamcounter.virtualCounter;
            }

            //Checks for illegal characters
            if (teamName.length == 1 && ",.<>?/;:'\"[{]}=+~`!@#$%^&*()".split("").some(i => teamName.includes(i))) {
                return message.channel.send(errormsg.illegalCharacters);
            }

            //Checks if teamname already exists
            let bool1 = true;
            message.guild.roles.cache.forEach(i => {
                if (i.name.toLowerCase() == teamName.toLowerCase()) {
                    bool1 = false;
                    return message.channel.send(errormsg.teamExists);
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
                    message.reply(errormsg.inTeam);
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
                let category = await message.guild.channels.create("Team " + teamNumber + " - " + teamName, {
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

                if(!inPerson){
                    //Read and write to json file (teamcounter.json - default = 500)
                    jsonReader(teamcounterFileName, (err, teamcounter) => {
                        if (err) {
                        console.log(err);
                        return;
                        }
                        console.log(teamcounter.virtualCounter);
                        teamcounter.virtualCounter += 1; //Increment counter by one

                        fs.writeFile(teamcounterFileName, JSON.stringify(teamcounter, null, 2), (err) => {
                            if(err) console.log('Error writing file:', err)
                        });
        
                    });
                }

            } else {
                message.channel.send(errormsg.teamLimit);
            }
        } else {
            message.channel.send(errormsg.commandAccess).then(r => r.delete({timeout: 10000}));
        }
    }
    

    /*
    * Add member command - Invites between 1-3 depending on size
    * o.addmember [teamname] @[user] 
    */
    if (command == prefix + "addmember") {
        
        const teamAssigned = teamAssignedID;
        const participant = participantID;
        const maxInTeam = 4;
        //let member = message.mentions.first();
        //mentions
        let mentions = message.mentions.members;

        //team name
        let indx = message.content.indexOf("[") + 1;
        let indx2 = message.content.indexOf("]", indx);
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
            message.channel.send(errormsg.cannotAddIntoTeamLimit);
            return;
        }

    }else{
        message.channel.send(errormsg.cannotAddIntoTeamNotInTeam);
    }
    }

    /*
    * Leave team command
    */
    if (command == prefix + "leaveteam") {

        //finds role of member
        let role = message.member.roles.cache.find(i => {
            args = args.map(j => j.replace(/\[/g,"").replace(/\]/g,""));
            return i.name == args.join(" ");
        });

        if (role != null) {
            await message.member.roles.remove(role);//removes person from role
            message.member.roles.remove(teamAssignedID);
            message.channel.send(errormsg.leftTeam);

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
            message.reply(errormsg.notInTeam);
        }



    }

    /*
    * Print names command and download as csv - Organizers only
    */
    if (command == prefix + "printnames") {
        message.delete({timeout: 0});
        
        if (message.member._roles.some(i => i == organizerID)) {
            message.author.send("\n------Verified Participants in Discord------\n").catch((error) => message.reply("Could not send you list"))
            
            const printCsv = './verified.csv'
            //Write csv file with information
            const createCsvWriter = require('csv-writer').createObjectCsvWriter;
            const csvWriter = createCsvWriter({
                path: printCsv,
                header: [
                    {id: 'profile.name', title: 'profile.name'},
                    {id: 'confirmation.discord', title: 'confirmation.discord'},
                    {id: 'team.discord', title: 'team.discord'}
                    //{id: 'email', title: 'email'}

                ]
            });
            //Array of users to push (records)
            const users = [];

            const count = 0;
            fs.createReadStream(csvPath)//create a stream that reads the file
                .pipe(csv())//pipe it as a csv format
                .on('data', (row) => {//when a row is formatted, we run this block. The row is defined as 'row'
                    //if (row["confirmation.discordUsername"] == message.author.tag) {
                           
                        var userName = ""+row[discordUsernameColName]
                        userName = userName.replace(/['"]+/g, '');
                        let person = message.guild.members.cache.find(i => i.user.tag === userName);
                        
                        let roles;
                        let savedRoles;

                        try{
                             roles =  person.roles.fetch();
                            console.log(roles)
                             savedRoles = person.roles.map(role => role.name)
                            console.log(savedRoles)
                        }catch (error) {
                            console.log(error);
                        }


                        //check validity
                        if(person != null && person.roles.some(i => i == participantID)){
                            let name = row[signatureLiabilityColName]
                            //let email = row[emailColName]
                            const user = {
                                'profile.name' : name,
                                'confirmation.discord': userName,
                                //'email': email
                            }
                            //Add to array
                            users.push(user)
                        //    message.author.send(row[signatureLiabilityColName] + ", " + userName).catch((error)); 
                        }

                        })
                .on('end', () => {//when the file is done being read this runs
                        //message.author.send("Total Verified Users: " + count);
                    //say they're not a registered user
                    //message.member.send("Hey you need to confirm")
                    //Write to csv
                     csvWriter.writeRecords(users).then(()=> console.log("Written csv"))
             
                    //Create message attachment
                    const { MessageAttachment } = require("discord.js")
                    const file = new MessageAttachment(printCsv)
        
                    //Send message to user
                    message.author.send(file).catch((error))


                });


        } else {
            message.channel.send(errormsg.commandAccess).then(r => r.delete({timeout: 10000}));
        }
        message.author.send("------ Finished ------\n");
    }


});


bot.login(config.token);
