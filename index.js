require('dotenv').config()
const fs = require('fs')
const Json2csvParser = require('json2csv').Parser

const github = require('@octokit/rest')({
  auth: `token ${process.env.GITHUB_TOKEN}`,
  previews: [
    'hellcat-preview'
  ],
  // Set this to GHE url or will default to dotcom
  baseUrl: process.env.GITHUB_API_URL
})

let table = []

async function getData () {
  var orgs = []
  const orgOptions = github.orgs.listForAuthenticatedUser.endpoint.merge()
  await github.paginate(orgOptions).then(response => {
    orgs = [].concat.apply([], response.map(r => r.login))
  })

  var members = []
  for (const org of orgs) {
    // Output current Org to console
    console.log(`Current Org processing: ${org}`)

    const memberOptions = github.orgs.listMembers.endpoint.merge({
      org: org
    })
    await github.paginate(memberOptions).then(response => {
      members = new Set([].concat.apply([], response.map(r => r.login)))
    })

    // Get all repositories for the organization
    var repos = []
    const orgRepoOptions = github.repos.listForOrg.endpoint.merge({
      org: org
    })
    await github.paginate(orgRepoOptions).then(response => {
      repos = [].concat.apply([], response.map(r => r))
    })

    for (const repo of repos) {
      // Output current Repository to console
      console.log(`Current Repo processing: ${repo.name}`)

      // Pull a list of teams and their access to the current repository
      var repoTeams = []
      const repoTeamOptions = github.repos.listTeams.endpoint.merge({
        owner: org,
        repo: repo.name
      })
      await github.paginate(repoTeamOptions).then(response => {
        repoTeams = [].concat.apply([], response.map(r => r))
      })

      // Pull a list of outside collaborators for the current repository
      var repoCollabs = []
      const collaboratorOptions = github.repos.listCollaborators.endpoint.merge({
        owner: org,
        repo: repo.name,
        affiliation: 'outside'
      })
      await github.paginate(collaboratorOptions).then(response => {
        repoCollabs = [].concat.apply([], response.map(r => r))
      })

      // Loop teams and query permissions and members
      for (const team of repoTeams) {
        // Output current team to console
        console.log(`Processing Team: ${team.slug}`)

        var teamMembers = []
        const teamMemberOptions = github.teams.listMembers.endpoint.merge({
          team_id: team.id
        })

        await github.paginate(teamMemberOptions).then(response => {
          teamMembers = [].concat.apply([], response.map(r => r.login))
        })

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

  if (process.argv[2] === 'true') {
    // Get member repositories
    for (const member of members) {
      var memberRepos = []
      const memberRepoOptions = github.repos.listForUser.endpoint.merge({
        username: member,
        type: 'all'
      })

      await github.paginate(memberRepoOptions).then(response => {
        memberRepos = [].concat.apply([], response.map(n => n.name))
      })

      for (const repo of memberRepos) {
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
  })

  // Write to CSV file
  const fields = ['org', 'repo', 'team', 'user', 'permission', 'type']
  const json2csvParser = new Json2csvParser({ fields, delimiter: ';' })

  const csv = json2csvParser.parse(table)
  console.log(csv)
  fs.writeFile('repo-permissions.csv', csv, (err) => {
    if (err) throw err
    console.log('file saved!')
  })
}).catch(console.error)
