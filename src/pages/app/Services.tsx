import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Grid, Card, Image, Text, Button, Loader, Center } from "@mantine/core";
import { getAllServices, type Service } from "../../api/services";

export default function AppServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAllServices()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBookNow = (serviceId: string) => {
    const session = localStorage.getItem("session");
    if (!session) {
      navigate(`/sign-in?redirect=/book?serviceId=${serviceId}`);
      return;
    }
    navigate(`/book?serviceId=${serviceId}`);
  };

  if (loading) return <Center className="h-[70vh] flex-col"><Loader size="lg" /></Center>;

  return (
    <Grid mt="xl" className="max-w-6xl mx-auto">
      {services.map((s) => (
        <Grid.Col key={s._id} span={{ base: 12, sm: 6, md: 4 }}>
          <Card
            shadow="sm"
            radius="lg"
            padding="lg"
            withBorder
            className="transition-transform hover:scale-[1.02] flex flex-col h-full bg-white/80 backdrop-blur-sm"
          >
            <Card.Section className="overflow-hidden rounded-lg">
              <div className="h-[250px] w-full overflow-hidden">
                <Image
                  src={s.imageUrl || "/img/placeholder.jpg"}
                  alt={s.name}
                  fit="contain"
                  className="h-full w-full max-h-[250px]"
                />
              </div>
            </Card.Section>

            <div className="flex flex-col grow mt-3">
              <Text fw={600} size="lg" mb={2} lineClamp={1}>
                {s.name}
              </Text>
              <Text size="sm" c="dimmed" lineClamp={2} mb="auto">
                {s.description}
              </Text>

              <Text fw={500} mt="sm" size="sm">
                ₱{s.price.toFixed(2)} • {s.duration} mins
              </Text>

              <Button
                mt="md"
                fullWidth
                color="blue"
                className="bg-blue-600! hover:bg-blue-700! text-white transition-all duration-200"
                disabled={s.status !== "available"}
                onClick={() => handleBookNow(s._id)}
              >
                {s.status === "available" ? "Book Now" : "Unavailable"}
              </Button>
            </div>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
}
