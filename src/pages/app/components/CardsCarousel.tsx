import { Carousel } from '@mantine/carousel';
import {Button, Center, Loader, Paper, Text, Title, useMantineTheme} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import classes from './CardsCarousel.module.css';
import '@mantine/carousel/styles.css';
import {useEffect, useState} from "react";
import {getAllServices, type Service} from "../../../api/services";
import {useNavigate} from "react-router";

function Card({ imageUrl, name, category }: Service) {
    const navigate = useNavigate();

    return (
        <Paper
            shadow="md"
            p="xl"
            radius="md"
            style={{ backgroundImage: `url(${imageUrl})` }}
            className={classes.card}
        >
            <div>
                <Text className={classes.category} size="xs">
                    {category}
                </Text>
                <Title order={3} className={classes.title}>
                    {name}
                </Title>
            </div>
            <Button variant="white" color="dark" onClick={() => navigate('/services')}>
                Book Now
            </Button>
        </Paper>
    );
}

export function CardsCarousel() {
    const theme = useMantineTheme();
    const mobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    const slides = services.map((item) => (
        <Carousel.Slide key={item._id}>
            <Card {...item} />
        </Carousel.Slide>
    ));


    useEffect(() => {
        getAllServices()
            .then(setServices)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Center className="h-[70vh] flex-col"><Loader size="lg" /></Center>;

    return (
        <Carousel
            slideSize={{ base: '100%', sm: '50%' }}
            slideGap="md"
            emblaOptions={{ align: 'start', slidesToScroll: mobile ? 1 : 2 }}
            nextControlProps={{ 'aria-label': 'Next slide' }}
            previousControlProps={{ 'aria-label': 'Previous slide' }}
        >
            {slides}
        </Carousel>
    );
}