// Choose only one import style, preferably:
import '../styles/globals.css'
// Remove the duplicate import with @/
import Layout from '../components/Layout'

function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}

export default MyApp 