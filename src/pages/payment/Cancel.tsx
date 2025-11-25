import { Center, Loader, Text } from "@mantine/core";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function PaymentCancelled() {
    const navigate = useNavigate();

    useEffect(() => {
        const timeout = setTimeout(() => navigate("/"), 2000);
        return () => clearTimeout(timeout);
    }, [navigate]);

    return (
        <Center className="h-[70vh] flex-col">
            <Loader color="red" size="lg" />
            <Text mt="md" fw={600} c="red">
                Payment was cancelled. Redirecting...
            </Text>
        </Center>
    );
}
