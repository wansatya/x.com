import { useState, useEffect } from "react"
import { useNavigate } from 'react-router-dom'
import Header from "../components/Header"

import { getAuth, signOut, onAuthStateChanged } from "firebase/auth"
import Game from '../components/PhaserGame'

function Featured() {
  const [session, setSession] = useState(null)
  const navigate = useNavigate();
  const auth = getAuth();
  const [user, setUser] = useState(null)

  const logOut = async () => {
    await signOut(auth);
    setUser(null)
    localStorage.removeItem('user')
    navigate('/')
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, [])

  return (
    <>
      <div className="w-full md:w-600">

        <Header title="Do you care enough?" />

        <div
          className="min-h-[92vh] border-b border-dim-200 cursor-pointer transition duration-350 ease-in-out border-l border-r">

          <Game />
        </div>

      </div>
    </>
  )
}

export default Featured