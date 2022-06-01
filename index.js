const { GraphQLClient, gql } = require('graphql-request')

const graphQLClient = new GraphQLClient(
  'https://api-stars.github.com/',
  {
    headers: {
      authorization: `Bearer ${process.env.TOKEN}`
    }
  }
)

const Parser = require('rss-parser')
const parser = new Parser()

/**
 * Method to get all links from a RSS feed
 * @param {string} url - link to your rss
 * @param {string} type - enum: BLOGPOST or VIDEO_PODCAST
 * @returns an array of links already in the correct object shape to the Stars API
 */
async function getContributions(url, type) {
  const feed = await parser.parseURL(url)

  const posts = feed.items.map((item) => ({
    type,
    date: new Date(item.pubDate).toISOString(),
    title: item.title,
    description: type === 'VIDEO_PODCAST' ? item.title : item.content,
    url: item.link
  }))

  return posts
}

/**
 * Method to get all saved contributions in the Stars API
 * @returns
 */
async function getSavedContributions() {
  const query = gql`
    query getContribuitions {
      contributions {
        url
      }
    }
  `

  const data = await graphQLClient.request(query)
  return data.contributions
}

/**
 * Method to create new contributions to the Stars API
 * @param {array} variables - an array of links
 */
async function createContributions(variables) {
  const mutation = gql`
    mutation createContributions($input: [ContributionInput]) {
      createContributions(data: $input) {
        id
        title
        url
      }
    }
  `

  const data = await graphQLClient.request(mutation, { input: variables })
  console.log(`
    ============================
    List of contributions added:
    ============================
  `)
  console.log(JSON.stringify(data, undefined, 2))
}

/**
 * Method to populate only the new links
 */
async function populateData() {
  const blog = await getContributions(
    'https://www.willianjusten.com.br/feed.xml',
    'BLOGPOST'
  )
  const youtube = await getContributions(
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCa12brLWzCqnxN0KOyjfmJQ',
    'VIDEO_PODCAST'
  )

  const contrib = await getSavedContributions()

  // To get only new blog links
  let diffBlog = blog.filter(
    (obj) => !contrib.some((obj2) => obj.url == obj2.url)
  )

  // To get only new youtube links
  let diffYoutube = youtube.filter(
    (obj) => !contrib.some((obj2) => obj.url == obj2.url)
  )

  if ([...diffBlog, ...diffYoutube].length) {
    await createContributions([...diffBlog, ...diffYoutube])
  } else {
    console.log('Everything is already updated! Nice job :)')
  }
}

populateData()
