import { useSearchParams, useNavigate } from "react-router";
import { useEffect } from "react";
import { Loader, Center, Text } from "@mantine/core";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => navigate("/my-appointments"), 2000);
    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <Center className="h-[70vh] flex-col">
      <Loader color="green" size="lg" />
      <Text mt="md" fw={600} c="green">
        Payment successful! Redirecting...
      </Text>
    </Center>
  );
}
