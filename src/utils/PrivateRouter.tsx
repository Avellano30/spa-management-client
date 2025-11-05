import { useState, useEffect } from 'react';
import { Outlet, Navigate, useParams } from 'react-router';
import { jwtDecode, type JwtPayload } from 'jwt-decode';
import { notifications } from '@mantine/notifications';
import { IconExclamationMark } from '@tabler/icons-react';
import { rem } from '@mantine/core';
import Layout from '../components/Appshell';

export default function PrivateRoutes() {
    const [authorized, setAuthorized] = useState(true);
    const paramChange = useParams();

    useEffect(() => {
        const sessionToken = localStorage.getItem('session');
        const currentDate = Date.now() / 1000;

        if (sessionToken) {
            try {
                const decoded = jwtDecode<JwtPayload>(sessionToken);

                if (decoded.exp && currentDate < decoded.exp) {
                    setAuthorized(true);
                } else {
                    showNotification('Session Expired');
                    clearStorage();
                    setAuthorized(false);
                }
            } catch (error) {
                showNotification('Invalid Session');
                clearStorage();
                setAuthorized(false);
            }
        } else {
            showNotification('Invalid Session');
            clearStorage();
            setAuthorized(false);
        }
    }, [paramChange]);

    const showNotification = (title: string) => {
        notifications.show({
            color: 'orange',
            title: title,
            message: '',
            icon: <IconExclamationMark style={{ width: rem(18), height: rem(18) }} stroke={3} />,
            autoClose: 8000,
            withCloseButton: false
        });
    };

    const clearStorage = () => {
        localStorage.removeItem('user'),
        localStorage.removeItem('session')
    };

    return authorized ? (
        <Layout>
            <Outlet />
        </Layout>
    ) : (
        <Navigate to="/sign-in" />
    );
}