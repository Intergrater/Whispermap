// Choose only one import style, preferably:
import '../styles/globals.css'
// Import Leaflet CSS globally
import 'leaflet/dist/leaflet.css'
// Remove the duplicate import with @/
import Layout from '../components/Layout'
import { UserProvider } from '../contexts/UserContext'
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link 
          rel="stylesheet" 
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  )
}

export default MyApp 