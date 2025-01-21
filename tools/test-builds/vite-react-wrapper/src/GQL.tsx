import { ApolloClient, InMemoryCache, gql } from '@apollo/client/core'

const client = new ApolloClient({
    uri: 'https://flyby-router-demo.herokuapp.com/',
    cache: new InMemoryCache()
  })
  var locations = ['id', 'name', 'description']
  // @ts-ignore: Unreachable code error
const sendGQL = function (operationName = 'standalone') {
    client
      .query({
        query: gql`
      query ${operationName} {
        locations {
          ${locations.pop()}
        }
      }
    `
      })
  }

  // @ts-ignore: Unreachable code error
  const wrappedSendGql = newrelic.captureAjax(sendGQL, { applicationId: 'gql', licenseKey: 'gql' })
  // @ts-ignore: Unreachable code error
  document.addEventListener('click', function () { console.log('gql...'); wrappedSendGql('initialPageLoad') })
