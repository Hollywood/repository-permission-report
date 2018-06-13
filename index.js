require('dotenv').config()
const fs = require('fs')
const path = require('path')
const Json2csvParser = require('json2csv').Parser;
const github = require('@octokit/rest')({
  headers: {
    accept: 'application/vnd.github.hellcat-preview+json'
  },
  // Set this to GHE url
  baseUrl: process.env.GHE_URL || ''
})
require('./pagination')(github)

github.authenticate({
  type: 'token',
  token: process.env.ghToken
})

let table = []

async function getData () {
  const orgs = [].concat.apply([], (await github.paginate(github.orgs.getAll())).map(d => d.data.map(n => n.login)))
  const members = [].concat.apply([], (await github.paginate(github.users.getAll())).map(d => d.data.map(n => n.login)))

  for (const org of orgs) {

    // Get all repositories for the organization
    const repos = [].concat.apply([], (await github.paginate(github.repos.getForOrg({
      org: org
    }))).map(d => d.data.map(r => r)))

    for (const repo of repos) {
      // Pull a list of teams and their access to the current repository
      const repoTeams = [].concat.apply([], (await github.paginate(github.repos.getTeams({
        owner: org,
        repo: repo.name
      }))).map(d => d.data.map(t => t)))

      // Pull a list of outside collaborators for the current repository
      const repoCollabs = [].concat.apply([], (await github.paginate(github.repos.getCollaborators({
        owner: org,
        repo: repo.name,
        affiliation: 'outside'
      }))).map(d => d.data.map(c => c)))

      // Loop teams and query permissions and members
      for (const team of repoTeams) {
        const memberData = await github.paginate(github.orgs.getTeamMembers({
          id: team.id
        }))

        const teamMembers = [].concat.apply([], memberData.map(d => d.data.map(n => n.login)))

        for (const member of teamMembers) {
          table.push({
            org: org,
            team: team.name,
            user: member,
            repo: repo.name,
            type: 'MEMBER',
            permission: team.permission
          })
        }
      }

      for (const collab of repoCollabs) {
         table.push({
          org: org,
          team: 'N/A',
          user: collab.login,
          repo: repo.name,
          type: 'COLLAB',
          permission: collab.permissions.push ? 'push' : 'pull'
        })
      }
    }
  }

  // Get member repositories
  for (const member of members) {
    const memberRepos = await github.paginate(github.repos.getForUser({
      username: member,
      type: 'all'
    }))

    memberRepo = [].concat.apply([], memberRepos.map(d => d.data.map(n => n.name)))

    for (const repo of memberRepo) {
      table.push({
        org: member,
        team: 'N/A',
        user: member,
        repo: repo,
        type: 'PERSONAL',
        permission: 'owner'
      })
    }
  }
}

getData().then(() => {
  // Remove Duplicates
  table = table.filter((table, index, self) =>
    index === self.findIndex((t) => (
      t.repo === table.repo && t.user === table.user && t.team === table.team
    ))
  )

  // Sort by Team 
  table.sort((a, b) => {
    return a.repo > b.repo ? 1 : b.repo > a.repo ? -1 : 0;
  });

  // Write to CSV file
  const fields = ['org', 'repo', 'team', 'user', 'permission', 'type']
  const json2csvParser = new Json2csvParser({ fields, delimiter: ';' })

  const csv = json2csvParser.parse(table)
  console.log(csv)
  fs.writeFile('repo-permissions.csv', csv, (err) => {
    if (err) throw err
    console.log('file saved!')
  })
})
