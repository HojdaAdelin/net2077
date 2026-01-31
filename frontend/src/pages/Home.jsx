import { InboxProvider } from '../context/InboxContext';
import Hero from '../components/Hero';

export default function Home() {
  return (
    <InboxProvider>
      <Hero />
    </InboxProvider>
  );
}
