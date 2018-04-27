const fs = require('fs');
const Json2csvParser = require('json2csv').Parser;
var hasNextPage = true
var GithubGraphQLApi = require('node-github-graphql')
var organization = "ORG_NAME_HERE"
var github = new GithubGraphQLApi({
  Promise: require('bluebird'),
  token: 'GITHUB_PAT_HERE',
  debug: false
})

github.query(`
{
  organization(login: "${organization}") {
    teams(first: 100) {
      edges {
        node {
          name
          repositories(first: 10) {
            edges {
              permission
              node {
                name
                collaborators(first:100, affiliation:OUTSIDE) {
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
          members(first: 100) {
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
    return (a.team > b.team) ? 1 : ((b.team > a.team) ? -1 : 0);
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