const fs = require('fs');
const Json2csvParser = require('json2csv').Parser;

var GithubGraphQLApi = require('node-github-graphql')
var organization = "ORG_NAME_HERE"
var github = new GithubGraphQLApi({
  Promise: require('bluebird'),
  token: 'GITHUB_PAT_HERE',
  //userAgent: 'Hello', // Optional, if not specified, a default user agent will be used
  debug: true
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
`
).then(function (response) {
  //console.log(JSON.stringify(response, null, 2))
  var orgs = []
  var bond = []
  var teams = []
  var members = []
  var repositories = []
  var collaborators = []

  const table = []

  response.data.organization.teams.edges.forEach((team) => {
    const teamName = team.node.name
    var repo = "No Repo Assigned"
    var permission = "NONE"

    team.node.repositories.edges.forEach(edge => {
      if(edge.node.name) {
        repo = edge.node.name
      }

      permission = edge.permission

      edge.node.collaborators.edges.forEach(collaborator => {
        table.push({
          repo, type: 'collab', team: teamName, user: collaborator.node.login, permission: collaborator.permission
        })
      })
    })

    team.node.members.nodes.forEach(node => {
      table.push({
        repo, type: 'member', team: teamName, user: node.login, permission: permission
      })
    })
  })

  var jsonResults = JSON.stringify(table)

 const fields = ['repo', 'type', 'team', 'user', 'permission']
 var json2csvParser = new Json2csvParser({ fields, delimiter: ';' })
 const csv = json2csvParser.parse(table)

fs.writeFile('repo-permissions.csv', csv, function(err) {
  if(err) throw err
  console.log('file saved!')
})

}).catch((err) => { console.log(err) })
