const fs = require('fs');
const Json2csvParser = require('json2csv').Parser;
var GithubGraphQLApi = require('node-github-graphql')
const queryParams = 'first: 25';
const teamHasNextPage = true;
const repoHasNextPage = true;
const organization = "YOUR_GH_ORG";
const ghToken = "YOUR_GH_PAT";
var github = new GithubGraphQLApi({
  Promise: require('bluebird'),
  token: ghToken,
  debug: false
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

github.query(`
{
  organization(login: "${organization}") {
    teams(${queryParams}) {
      edges {
        node {
          name
          repositories(${queryParams}) {
            edges {
              permission
              node {
                name
                collaborators(${queryParams}, affiliation:OUTSIDE) {
                  edges {
                    permission
                    node {
                      login
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          members(${queryParams}) {
            nodes {
              login
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
`).then(function (response) {
  var table = []

  //Loop through response obj and push into object array
  //NEED to implement pagination
  response.data.organization.teams.edges.forEach((team) => {
    const teamName = team.node.name
    var repo = "No Repo Assigned"
    var permission = "NONE"

    team.node.repositories.edges.forEach(edge => {
      if (edge.node.name) {
        repo = edge.node.name
      }

      permission = edge.permission

      team.node.members.nodes.forEach(node => {
        table.push({
          repo,
          type: 'member',
          team: teamName,
          user: node.login,
          permission: permission
        })
      })

      edge.node.collaborators.edges.forEach(collaborator => {
        table.push({
          repo,
          type: 'collab',
          team: 'outside collaborator',
          user: collaborator.node.login,
          permission: collaborator.permission
        })
      })
    })
  })

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