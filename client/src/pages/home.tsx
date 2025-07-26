import { ChatInterface } from "@/components/chat-interface";

interface User {
  id: string;
  email: string;
  username: string | null;
  credits: number;
  role: string;
}

interface HomeProps {
  user: User | null;
}

export default function Home({ user }: HomeProps) {
  return <ChatInterface user={user} />;
}
