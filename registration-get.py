# registration-get
# $ python3 -m pip install requests
# $ python3 -m pip install beautifulsoup4
import json
import csv
import requests
from requests.auth import HTTPBasicAuth
from bs4 import BeautifulSoup

f = open('admin-reg.json',)

data = json.load(f)

#page url
URL = data['url']

#get request
page = requests.get(URL) 
with open('Users.csv', 'w') as f:
    writer = csv.writer(f)
    for line in page.iter_lines():
        writer.writerow(line.decode('utf-8').split(','))

#with open('hsdiscordbot/users.csv', 'wb') as f:
#    f.write(page.content)

#close json file
f.close()

#print(page.text)

#for parsing use soup
##soup = BeautifulSoup(page.content, "html.parser")

#find stats id
##results = soup.find(id="stats")

#find ui field 
##job_elements = results.find_all("div", class_="ui field")

