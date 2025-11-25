import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import '@mantine/tiptap/styles.css';
import '@mantine/notifications/styles.css';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from "react-router";

// Mantine
import { createTheme, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/code-highlight/styles.css';

//Private Route
import { AuthProvider } from './utils/AuthContext';
import PrivateRoutes from './utils/PrivateRouter';

//Routes
import AppLayout from './App';
import SignIn from "./pages/auth/SignIn.tsx";
import SignUp from './pages/auth/SignUp.tsx';
import Settings from './pages/settings/index.tsx';
import Appointments from './pages/appointments/index.tsx';
import AppAbout from './pages/app/About.tsx';
import AppHome from './pages/app/Home.tsx';
import BookAppointment from './pages/appointments/BookAppointment.tsx';
import PaymentSuccess from './pages/payment/Success.tsx';
import PaymentCancelled from './pages/payment/Cancel.tsx';
import RequestReset from './pages/passwordReset/requestReset.tsx';
import ResetPasswordPage from './pages/passwordReset/resetPassword.tsx';

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path='/sign-in' element={<SignIn />} />
            <Route path='/sign-up' element={<SignUp />} />
            <Route path="/password-reset" element={<RequestReset />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route element={<AppLayout />}>
                <Route path='/' element={<AppHome />} />
                <Route path='/about' element={<AppAbout />} />
            </Route>
            <Route element={<PrivateRoutes />}>
                <Route path='/my-appointments' element={<Appointments />} />
                <Route path='/book' element={<BookAppointment />} />
                <Route path='/settings' element={<Settings />} />
            </Route>
            <Route path='/payment-success' element={<PaymentSuccess />} />
            <Route path='/payment-cancelled' element={<PaymentCancelled />} />
        </>
    )
);

const theme = createTheme({
    /** Put your mantine theme override here */
    // fontFamily: 'Inter, sans-serif',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
        <React.StrictMode>
            <AuthProvider>
                <MantineProvider theme={theme}>
                    <Notifications limit={1} zIndex={1000} position='top-right' miw={250} w={"fit-content"} />
                    <RouterProvider router={router} />
                </MantineProvider>
            </AuthProvider>
        </React.StrictMode>
    </GoogleOAuthProvider>,
)