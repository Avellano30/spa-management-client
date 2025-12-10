import { useState } from "react";
import { Button, Container, Title, Text, Stack, Divider } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useSearchParams } from "react-router";
import { resendEmailVerification } from "../../api/emailVerification";

export default function ResendEmailVerification() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await resendEmailVerification(email);
      showNotification({
        title: "Verification Email Sent",
        message: "Please check your inbox for a new verification link.",
        color: "green",
      });
    } catch (err: any) {
      showNotification({
        title: "Error",
        message: err?.message || "Failed to send verification email.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" mt={80}>
      <div className="bg-white rounded-xl shadow-md p-10 border border-gray-100">
        <Stack align="center">
          <Title order={2} className="text-blue-600 text-center tracking-wide">
            Serenity Spa
          </Title>

          <Divider my="xs" w="60%" />

          <Title order={4} className="text-center font-semibold">
            Verify Your Email Address
          </Title>

          <Text size="sm" ta="center" maw={320} className="text-gray-600">
            We’ve sent a verification link to your email.  
            Please open the link to activate your account.
          </Text>

          <Text size="xs" ta="center" maw={300} className="text-gray-500 mt-1">
            Didn’t receive anything? Make sure to check your spam or junk folder.
          </Text>

          <Button
            fullWidth
            mt="lg"
            radius="md"
            onClick={handleSubmit}
            loading={loading}
            className="bg-blue-600 hover:bg-blue-700 transition-all"
            size="md"
          >
            Resend Verification Email
          </Button>
        </Stack>
      </div>
    </Container>
  );
}
