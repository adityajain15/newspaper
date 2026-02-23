import acceptedNewspapers from '../fixtures/acceptedNewspapers.js'

const fetchNewspapers = async (limit = 50, nextToken = null) => {
  const query = `
    query listActiveFrontPages($limit: Int, $nextToken: String) {
      listActiveFrontPages(limit: $limit, nextToken: $nextToken) {
        nextToken
        items {
          ...FrontPageData
        }
      }
    }
    
    fragment FrontPageData on FrontPage {
      title
      date
      images {
        medium
        large
      }
      pdf
      topics
      newsPaper {
        ...NewsPaperSummaryData
      }
    }
    
    fragment NewsPaperSummaryData on NewsPaperSummary {
      name
      slug
      city
      state
      country
      region
      latitude
      longitude
      website
    }
  `

  const variables = {
    limit,
    nextToken,
  }

  try {
    const response = await fetch(
      'https://45hclcjhi5bljn7uixadeenerq.appsync-api.us-east-1.amazonaws.com/graphql',
      {
        method: 'POST',
        headers: {
          accept: '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'content-type': 'application/json',
          'sec-ch-ua':
            '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'x-api-key': 'da2-qo3h72f3vbcp5ds6o77xkxhram',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data.listActiveFrontPages
  } catch (error) {
    console.error('Error fetching newspapers:', error)
    throw error
  }
}

const fetchAllNewspapersMetadata = async () => {
  let allItems = []
  let nextToken = null
  let pageCount = 0

  do {
    const result = await fetchNewspapers(50, nextToken)
    allItems = allItems.concat(result.items)
    nextToken = result.nextToken
    pageCount++
    console.log(`Fetched page ${pageCount} with ${result.items.length} items`)
  } while (nextToken)

  return allItems.filter((item) =>
    acceptedNewspapers.includes(item.newsPaper.name),
  )
}

export default fetchAllNewspapersMetadata
