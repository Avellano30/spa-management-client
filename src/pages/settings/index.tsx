import { useEffect, useState } from "react";
import {
    Paper,
    Title,
    TextInput,
    Button,
    Group,
    Stack,
    Loader,
    Alert,
    Divider,

} from "@mantine/core";
import { IconCheck, IconAlertCircle } from "@tabler/icons-react";

const endpoint = import.meta.env.VITE_ENDPOINT;

interface ClientProfile {
    _id: string;
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    phone?: string;
}

function getUserIdFromToken(): string | null {
    try {
        const token = localStorage.getItem("session");
        if (!token) return null;
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.userId ?? null;  // ← your JWT uses "userId"
    } catch {
        return null;
    }
}

export default function Settings() {
    const [profile, setProfile] = useState<ClientProfile | null>(null);
    const [form, setForm] = useState<Partial<ClientProfile>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        const userId = getUserIdFromToken();
        if (!userId) {
            setError("Could not identify the logged-in user. Please log in again.");
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${endpoint}/client/record/${userId}`);
            if (!res.ok) throw new Error();
            const data: ClientProfile = await res.json();
            setProfile(data);
            setForm({
                firstname: data.firstname,
                lastname: data.lastname,
                username: data.username,
                phone: data.phone ?? "",
            });
        } catch {
            setError("Failed to load your profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setSuccess(false);
        setError(null);
        try {
            const res = await fetch(`${endpoint}/client/record/${profile._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            setSuccess(true);
            await fetchProfile();
        } catch {
            setError("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper shadow="sm" p="xl" radius="md" className="max-w-lg mx-auto mt-8">
            <Title order={3} mb="md">Account Settings</Title>

            {loading ? (
                <Group justify="center" p="xl">
                    <Loader />
                </Group>
            ) : (
                <Stack>
                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                            Profile updated successfully.
                        </Alert>
                    )}

                    <Group grow>
                        <TextInput
                            label="First name"
                            value={form.firstname ?? ""}
                            onChange={(e) => {
                                const lettersOnly = e.currentTarget.value.replace(/[^a-zA-Z\s]/g, "");

                                setForm({
                                    ...form,
                                    firstname: lettersOnly,
                                });
                            }}
                        />

                        <TextInput
                            label="Last name"
                            value={form.lastname ?? ""}
                            onChange={(e) => {
                                const lettersOnly = e.currentTarget.value.replace(/[^a-zA-Z\s]/g, "");

                                setForm({
                                    ...form,
                                    lastname: lettersOnly,
                                });
                            }}
                        />
                    </Group>

                    <TextInput
                        label="Username"
                        value={form.username ?? ""}
                        onChange={(e) => setForm({ ...form, username: e.currentTarget.value })}
                    />



                    <TextInput
                        label="Phone"
                        type="tel"
                        value={form.phone ?? ""}
                        placeholder="e.g. 09123456789"
                        onChange={(e) => {
                            const numbersOnly = e.currentTarget.value.replace(/\D/g, "");

                            setForm({
                                ...form,
                                phone: numbersOnly,
                            });
                        }}
                    />

                    <Divider mt="sm" />

                    <Group justify="flex-end" mt="sm">
                        <Button variant="light" onClick={fetchProfile} disabled={saving}>
                            Discard
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            Save Changes
                        </Button>
                    </Group>
                </Stack>
            )}
        </Paper>
    );
}