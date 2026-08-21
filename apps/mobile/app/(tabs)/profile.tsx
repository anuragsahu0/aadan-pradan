import { Redirect } from 'expo-router';

export default function ProfileRedirect() {
  return <Redirect href="/(tabs)/me" />;
}
