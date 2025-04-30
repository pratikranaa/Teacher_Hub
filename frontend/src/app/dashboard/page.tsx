/* client side component */
/* push user to link based on their type */

'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'


export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (!userData) {
      router.push('/login')
      return
    }

    const user = JSON.parse(userData)

    // Handle different routes based on user status
    if (user.profileCompleted) {
      if (user.verificationStatus === 'PENDING') {
        router.push('/verification-pending')
      } else if (user.verificationStatus === 'REJECTED') {
        router.push('/verification-rejected')
      } else if (user.userType === 'SCHOOL' || user.userType === 'SCHOOL_ADMIN' || user.userType === 'PRINCIPAL') {
        router.push('/dashboard-school')
      } else if (user.userType === 'STUDENT') {
        router.push('/dashboard-student')
      } else if (user.userType === 'TEACHER' || user.userType === 'INTERNAL_TEACHER' || user.userType === 'EXTERNAL_TEACHER') {
        router.push('/dashboard-teacher')
      }
    } else {
      router.push('/profile-completion')
    }
  }, [router])

  return null
}