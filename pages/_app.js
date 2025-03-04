// Choose only one import style, preferably:
import '../styles/globals.css'
// Remove the duplicate import with @/
import Layout from '../components/Layout'
import { UserProvider } from '../contexts/UserContext'

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  )
}

export default MyApp 