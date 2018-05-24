require('dotenv').config()
const fs = require('fs')
const path = require('path')
const Json2csvParser = require('json2csv').Parser;
const github = require('@octokit/rest')()
require('./pagination')(github)
github.authenticate({
  type: 'token',
  token: process.env.ghToken
})


//Get list of all Orgs and Member accounts
//Loop through each of these results
//Run GraphQL SEARCH query type:REPOSITORY and query: "org:CURRENT_ORG/MEMBER"
//All repositories and the associated members/permissions

//Proposed workflow
//1. Import file containing list of required Orgs (provided by client)
//2. Loop through each and call the GH APIs to: capture each team, the repositories it has access to and permissions, and the members of said team.
//3. Add a distinct list of the members to an array object.
//4. Save/flatten the Org data into a table.
//5. Within each Org, loop through the array of members and pull all repositories they own, the members who have access to them, and their access level (PERSONAL can be the default team name)
//6. Append and flatten data into the existing table.
//7. Proceed to next Org.
//8. Since a member on a single instance can belong to multiple orgs, we need to remove the duplicate records.
//9. Output CSV.
  
  var orgList = fs.readFileSync(path.join(~/Documents/FakeDir, 'org-list.csv'), "utf8")
  var orgArray = orgList.split(',')
  
  for (let i = 0; i < orgArray.length; i++) {
    const orgName = orgArray[i];
    
    var orgTeams = await github.orgs.getTeams({'org':orgName})

  }

  //Remove Duplicates
  table = table.filter((table, index, self) =>
    index === self.findIndex((t) => (
      t.repo === table.repo && t.user === table.user && t.team === table.team
    ))
  )

  //Sort by Team 
  table.sort(function (a, b) {
    return a.repo > b.repo ? 1 : b.repo > a.repo ? -1 : 0;
  });

  //Write to CSV file
  var jsonResults = JSON.stringify(table)
  const fields = ['repo', 'type', 'team', 'user', 'permission']
  var json2csvParser = new Json2csvParser({
    fields,
    delimiter: ';'
  })
  const csv = json2csvParser.parse(table)
  console.log(csv)
  fs.writeFile('repo-permissions.csv', csv, function (err) {
    if (err) throw err
    console.log('file saved!')
  })

}).catch(console.error)