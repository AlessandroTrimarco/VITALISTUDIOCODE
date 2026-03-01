import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ChatInterface from '@/components/ChatInterface'

export default async function ChatPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <ChatInterface
      user={{
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
      }}
    />
  )
}
