import {useEffect, useState} from "react";
import {useSearchParams, useNavigate} from "react-router";
import {
    Button,
    Card,
    Text,
    Group,
    Loader,
    Image,
    Title,
    Container,
    Divider,
    SegmentedControl,
    Stack,
    Textarea,
    Stepper,
    Modal, Checkbox,
    ScrollArea,
} from "@mantine/core";
import {jwtDecode} from "jwt-decode";
import {DateInput, TimePicker} from "@mantine/dates";
import {notifications} from "@mantine/notifications";
import {getAllServices, type Service} from "../../api/services";
import {confirmAppointment, createAppointment, deleteAppointment} from "../../api/appointments";
import {createOnlinePayment} from "../../api/payment";

interface DecodedToken {
    userId: string;
}

export default function BookAppointment() {
    const [searchParams] = useSearchParams();
    const serviceId = searchParams.get("serviceId");
    const [service, setService] = useState<Service | null>(null);
    const [active, setActive] = useState(0);
    const [date, setDate] = useState<string | null>(null);
    const [time, setTime] = useState<string | undefined>(undefined);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [paymentType, setPaymentType] = useState<"Cash" | "Online">("Cash");
    const [paymentMode, setPaymentMode] = useState<"Full" | "Downpayment">("Full");
    const [tempAppointmentId, setTempAppointmentId] = useState<string | null>(null);

    // Terms modal state
    const [termsOpened, setTermsOpened] = useState(false);
    const [termsAgreed, setTermsAgreed] = useState(false); // final persisted agreement
    const [termsChecked, setTermsChecked] = useState(false); // temporary checkbox in modal

    const navigate = useNavigate();

    useEffect(() => {
        if (!serviceId) return;
        getAllServices()
            .then((data) => setService(data.find((s) => s._id === serviceId) || null))
            .catch(console.error);
    }, [serviceId]);

    useEffect(() => {
        const agreed = localStorage.getItem("termsAgreed");
        if (agreed === "true") {
            setTermsAgreed(true);
            setTermsChecked(false); // no need to check the box automatically
        } else {
            setTermsAgreed(false);
            setTermsChecked(false);
            // Show modal so user can agree (optional - only show if they haven't agreed)
            setTermsOpened(true);
        }
    }, []);

    const openTermsModal = () => {
        // Reset temporary checkbox whenever modal opens so they must actively check it and press Continue
        setTermsChecked(false);
        setTermsOpened(true);
    };

    const handleContinueAgree = () => {
        // Persist agreement only when user clicks Continue
        setTermsAgreed(true);
        localStorage.setItem("termsAgreed", "true");
        setTermsOpened(false);
    };

    const handleCloseTermsModal = () => {
        // If they close without pressing Continue, clear temporary check and ensure persisted agreement is false.
        // Only override localStorage if they haven't previously agreed.
        setTermsOpened(false);
        setTermsChecked(false);
        if (!termsAgreed) {
            setTermsAgreed(false);
            localStorage.setItem("termsAgreed", "false");
        }
    };

    const handleNext = async () => {
        if (!termsAgreed) {
            return notifications.show({
                title: "Terms not agreed",
                message: (
                    <Text size="sm">
                        You must agree to the Terms & Conditions before booking.{" "}
                        <Text
                            span
                            c="blue"
                            fw={600}
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                            onClick={openTermsModal}
                        >
                            Click here to review & agree.
                        </Text>
                    </Text>
                ),
                color: "yellow",
            });
        }

        if (active === 0 && (!date || !time)) {
            return notifications.show({
                title: "Incomplete Details",
                message: "Please select a date and time before continuing.",
                color: "yellow",
            });
        }

        // Create temporary appointment when moving from step 1 → 2
        if (active === 1 && !tempAppointmentId) {
            const sessionToken = localStorage.getItem("session");
            if (!sessionToken)
                return navigate(`/sign-in?redirect=/book-appointment?serviceId=${serviceId}`);

            const decoded = jwtDecode<DecodedToken>(sessionToken);
            const clientId = decoded.userId;

            try {
                setLoading(true);
                const appointment = await createAppointment({
                    clientId,
                    serviceId: service?._id!,
                    date,
                    startTime: time,
                    notes,
                    isTemporary: true, // mark as temporary
                });
                setTempAppointmentId(appointment.id);
            } catch (err: any) {
                notifications.show({
                    title: "Error",
                    message: err.message || "Could not create temporary booking.",
                    color: "red",
                });
                return; // stop progression
            } finally {
                setLoading(false);
            }
        }

        setActive((prev) => prev + 1);
    };

    const handleBack = async () => {
        // If going back from Step 3 → 2, delete temp appointment
        if (active === 2 && tempAppointmentId) {
            try {
                await deleteAppointment(tempAppointmentId);
                setTempAppointmentId(null);
            } catch (err) {
                console.warn("Failed to delete temp appointment", err);
            }
        }
        setActive((prev) => prev - 1);
    };

    const handleSubmit = async () => {
        if (!service || !date || !time) return;

        try {
            setLoading(true);

            // Use tempAppointmentId if it exists, otherwise create final one
            let appointmentId = tempAppointmentId;
            if (!appointmentId) {
                const sessionToken = localStorage.getItem("session");
                if (!sessionToken)
                    return navigate(`/sign-in?redirect=/book-appointment?serviceId=${serviceId}`);

                const decoded = jwtDecode<DecodedToken>(sessionToken);
                const clientId = decoded.userId;

                const appointment = await createAppointment({
                    clientId,
                    serviceId: service._id,
                    date,
                    startTime: time,
                    notes,
                });
                appointmentId = appointment._id;
            }

            if (paymentType === "Online") {
                const {url} = await createOnlinePayment(appointmentId, paymentMode);
                window.location.href = url;
            } else {
                await confirmAppointment(appointmentId);
                notifications.show({
                    title: "Appointment Booked!",
                    message: "Your booking has been saved. Please pay on site.",
                    color: "green",
                });
                navigate("/my-appointments");
            }
        } catch (err: any) {
            notifications.show({
                title: "Booking Failed",
                message: err.message || "Something went wrong, please try again.",
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    if (!service) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader size="lg"/>
            </div>
        );
    }

    return (
        <>
            {/* --- Terms & Conditions Modal --- */}
            <Modal
                opened={termsOpened}
                onClose={handleCloseTermsModal}
                title="Terms & Conditions"
                size="md"
            >
                <ScrollArea h={300} className="border border-gray-300 p-4 rounded-xl">
                    <Text size="sm" c="dimmed">
                        <strong>Booking Policy:</strong><br/>
                        • A <strong>30% downpayment</strong> is required to confirm your booking.<br/>
                        • The downpayment is <strong>non-refundable</strong>.<br/>
                        • Remaining <strong>70% balance</strong> must be paid before or on the day of the appointment.<br/>
                        • All appointments are subject to availability and are considered confirmed only after downpayment is received.<br/>
                        • Clients are responsible for ensuring their contact information is accurate for booking confirmation and notifications.<br/><br/>

                        <strong>Cancellation & Rescheduling:</strong><br/>
                        • You may <strong>cancel</strong> an appointment only while it is still marked as <strong>Pending</strong>.<br/>
                        • You may <strong>reschedule</strong> an appointment if it is <strong>Approved</strong> or <strong>Rescheduled</strong>, provided it is done at least <strong>24 hours before</strong> the scheduled start time.<br/>
                        • Cancellations or reschedule requests made less than 24 hours before the appointment may not be accommodated.<br/>
                        • Refunds are not provided for cancellations, except when the spa must cancel due to unavoidable circumstances.<br/><br/>

                        <strong>Late Arrival Policy:</strong><br/>
                        • Arriving more than <strong>15 minutes late</strong> may result in a shortened session to avoid impacting other clients.<br/>
                        • Excessive delays may be treated as a no-show, resulting in forfeiture of any payments made.<br/><br/>

                        <strong>No-Show Policy:</strong><br/>
                        • Failure to arrive without prior notice will be considered a <strong>no-show</strong> and may result in full service charges or forfeiture of downpayment.<br/>
                        • Repeated no-shows may result in booking restrictions.<br/><br/>

                        <strong>Health & Safety:</strong><br/>
                        • Please inform your therapist of any medical conditions, injuries, allergies, or physical limitations before your session.<br/>
                        • The spa reserves the right to decline or modify treatment based on health concerns for client safety.<br/><br/>

                        <strong>Client Conduct & Etiquette:</strong><br/>
                        • Respectful behavior toward staff and other clients is required at all times.<br/>
                        • Inappropriate or abusive behavior may result in the immediate termination of the session with no refund.<br/><br/>

                        <strong>Privacy & Confidentiality:</strong><br/>
                        • All client information is kept confidential and is used only for booking and service purposes.<br/><br/>

                        <strong>Agreement:</strong><br/>
                        • By checking the agreement box and proceeding with the booking, you acknowledge that you have read, understood, and agreed to all terms and conditions listed above.<br/>
                    </Text>

                </ScrollArea>

                <Checkbox
                    mt="md"
                    checked={termsChecked}
                    onChange={(e) => {
                        setTermsChecked(e.currentTarget.checked);
                    }}
                    label="I agree to the Terms & Conditions"
                />

                <Button
                    mt="md"
                    fullWidth
                    disabled={!termsChecked}
                    onClick={handleContinueAgree}
                >
                    Continue
                </Button>
            </Modal>


            <Container size="lg" className="py-1">
                <div className="flex flex-col md:flex-row gap-10">
                    {/* --- Service Info --- */}
                    <Card shadow="md" radius="md" withBorder
                          className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm">
                        <Image
                            src={service.imageUrl || "/img/placeholder.jpg"}
                            height={250}
                            fit="contain"
                            alt={service.name}
                            className="rounded-t-md max-h-[300px] mx-auto"
                        />
                        <div className="p-5">
                            <Title order={3}>{service.name}</Title>
                            <Text size="sm" c="dimmed" mt={4}>
                                {service.description}
                            </Text>
                            <Divider my="md"/>
                            <Group justify="space-between">
                                <Text fw={600}>₱{service.price}</Text>
                                <Text size="sm" c="dimmed">
                                    {service.duration} mins
                                </Text>
                            </Group>
                        </div>
                    </Card>

                    {/* --- Booking Stepper --- */}
                    <Card shadow="md" radius="md" withBorder className="flex-1 bg-white/80 backdrop-blur-sm relative">
                        <Title order={4} mb="md">
                            Book Your Appointment
                        </Title>

                        <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
                            <Stepper.Step label="Select Date & Time">
                                <Group grow mb="md">
                                    <DateInput
                                        label="Select Date"
                                        placeholder="Pick a date"
                                        value={date}
                                        onChange={setDate}
                                        minDate={new Date()}
                                    />
                                    <TimePicker label="Select Time" value={time} onChange={setTime} format="12h"
                                                withDropdown/>
                                </Group>
                            </Stepper.Step>

                            <Stepper.Step label="Notes & Payment">
                                <Textarea
                                    label="Notes (optional)"
                                    placeholder="Add any notes or preferences..."
                                    minRows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.currentTarget.value)}
                                    mb="lg"
                                />
                                <Stack gap="sm">
                                    <SegmentedControl
                                        fullWidth
                                        value={paymentType}
                                        onChange={(v) => setPaymentType(v as "Cash" | "Online")}
                                        data={[
                                            {label: "Pay on Site", value: "Cash"},
                                            {label: "Pay Online", value: "Online"},
                                        ]}
                                    />
                                    {paymentType === "Online" && (
                                        <SegmentedControl
                                            fullWidth
                                            value={paymentMode}
                                            onChange={(v) => setPaymentMode(v as "Full" | "Downpayment")}
                                            data={[
                                                {label: "Full Payment", value: "Full"},
                                                {label: "Downpayment (30%)", value: "Downpayment"},
                                            ]}
                                        />
                                    )}
                                </Stack>
                            </Stepper.Step>

                            <Stepper.Step label="Review & Confirm">
                                <Stack>
                                    <Text><b>Service:</b> {service.name}</Text>
                                    <Text><b>Date:</b> {date}</Text>
                                    <Text><b>Time:</b> {time}</Text>
                                    <Text><b>Payment:</b> {paymentType} ({paymentMode})</Text>
                                </Stack>
                            </Stepper.Step>

                            <Stepper.Completed>
                                <Text ta="center" fw={500} c="green">Booking complete!</Text>
                            </Stepper.Completed>
                        </Stepper>

                        {/* --- Bottom Buttons --- */}
                        <Group justify="space-between" mt="xl" className="sticky bottom-0 bg-white py-4 border-t">
                            {active > 0 && (
                                <Button variant="default" onClick={handleBack}>
                                    Back
                                </Button>
                            )}
                            {active < 2 ? (
                                <Button onClick={handleNext} loading={loading}>Next</Button>
                            ) : (
                                <Button
                                    loading={loading}
                                    onClick={handleSubmit}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {paymentType === "Online" ? "Proceed to Payment" : "Confirm Booking"}
                                </Button>
                            )}
                        </Group>
                    </Card>
                </div>
            </Container>
        </>

    );
}
