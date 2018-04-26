var GithubGraphQLApi = require('node-github-graphql')
var organization = "albatoss"
var github = new GithubGraphQLApi({
  Promise: require('bluebird'),
  token: 'A_GITHUB_PAT_GOES_HERE',
  //userAgent: 'Hello', // Optional, if not specified, a default user agent will be used
  debug: true
})
github.query(`
{
  organization(login: "${organization}") {
    teams(first: 5) {
      edges {
        node {
          name
          repositories(first: 5) {
            edges {
              permission
              node {
                name
                collaborators(first:5, affiliation:OUTSIDE) {
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
          members(first: 5) {
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

  response.data.organization.teams.edges.forEach((team, teamIndex) => {
    //teams.push(team.node)
    teams[teamIndex] = {}
    //Abstract Members
    team.node.members.nodes.forEach((member, index) => {
      members[index] = {}
      members[index].member = member.login
      members[index].team = team.node.name
    })

    teams[teamIndex].team = team.node.name
    teams[teamIndex].members = members
    teams[teamIndex].permission = ""

    //Abstract Repositories
    team.node.repositories.edges.forEach((repo, index) => {
      repositories[index] = {}
      repositories[index].repository = repo.node.name
      teams[teamIndex].permission = repo.permission

      //Abstract Collaborators
      repo.node.collaborators.edges.forEach((collaborator, index) => {
          collaborators[index] = {}
          collaborators[index].permission = collaborator.permission
          collaborators[index].collaborator = collaborator.node.login
      })

      repositories[index].collaborators = collaborators
      repositories[index].teams = teams
    })
  })

  var teamResults = teams
  var repoResults = repositories
  var collaboratorResults = collaborators
  var memberResults = members

  repositories.forEach((repo, index) => {
    console.log('Repository: ' + repo.repository)
    repositories[index].teams.forEach((team, index) => {
      console.log(' Team: ' + team.team)
      if (team.permission){
        console.log('   Repo Permission: ' + team.permission)
      } else {
        console.log('   No Permissions')
      }
      
      team.members.forEach((member, index) => {
        console.log('     User: ' + member.member)
      })

      if(repo.collaborators.length > 0){
        console.log('     Collaborators')

        repo.collaborators.forEach((collab, index) => {
          console.log('       Collaborator: ' + collab.collaborator)
          console.log('       Permission: ' + collab.permission)
        })
      }
      

    })
  })
  //console.log(repositories[0])

}).catch((err) => { console.log(err) })
