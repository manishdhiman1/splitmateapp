import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "expo-router";
import { Button, Image, StatusBar, Text, View } from "react-native";
import { useSession } from "../context/AuthContext";

export default function Home() {
  const router = useRouter();

  const { signOut, validateUser } = useSession();
  const { data, isLoggedIn, checkAuth } = useAuthStore();

  // useEffect(() => {
  //   checkAuth();
  // }, []);

  // useEffect(() => {
  //   checkAuth();
  //   if (!isLoggedIn) {
  //     router.navigate("./auth/login")
  //   }
  // }, [isLoggedIn])

  const handleLogout = async () => {
    const value = await signOut();
    // console.log("value", session);
  };

  const getProfile = async () => {
    console.log('start')
    const rst = await validateUser();
    console.log('result', rst)
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <StatusBar barStyle="dark-content" />
      <Text>Hello {data?.name},</Text>
      <Text>Email {data?.email},</Text>
      <Image source={{ uri: data.avatar }} style={{ width: 150, height: 150 }} />
      {/* <Text>Hello {data.},</Text> */}

      <Button title="get value" onPress={() => getProfile()} />
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

