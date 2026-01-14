import { Stack } from 'expo-router'
import React from 'react'
import Toast from 'react-native-toast-message'

const AuthLayout = () => {
    return (
        <>
            <Stack screenOptions={{ headerShown: false }}></Stack>
            <Toast />
        </>
    )
}

export default AuthLayout