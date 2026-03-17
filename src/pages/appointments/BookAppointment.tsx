import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
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
  Modal,
  Checkbox,
  ScrollArea,
  Box,
  Badge,
  SimpleGrid,
  Select,
} from "@mantine/core";
import { jwtDecode } from "jwt-decode";
import { DateInput, TimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { getAllServices, type Service } from "../../api/services";
import { getAllEmployees } from "../../api/employees";
import {
  confirmAppointment,
  createAppointment,
  deleteAppointment,
  getClientId,
} from "../../api/appointments";
import { createPaymongoPayment } from "../../api/payment";
import { getSpaSettings, type SpaSettings } from "../../api/settings";
import BookingCalendar from "../../components/BookingCalendar";
import dayjs from "dayjs";
import { getAppointments } from "../../api/appointments";

interface DecodedToken {
  userId: string;
}

interface SelectedService {
  service: Service;
  intensity?: string;
}

export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const intensityParam = searchParams.get("intensity");
  const [services, setServices] = useState<SelectedService[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [active, setActive] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"Cash" | "Online">("Cash");
  const [paymentMode, setPaymentMode] = useState<"Full" | "Downpayment">(
    "Full",
  );
  const [tempAppointmentIds, setTempAppointmentIds] = useState<string[]>([]);

  // Terms modal state
  const [termsOpened, setTermsOpened] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false); // final persisted agreement
  const [termsChecked, setTermsChecked] = useState(false); // temporary checkbox in modal

  // Intensity selection modal
  const [intensityModal, setIntensityModal] = useState<{
    service: Service;
    onSelect: (intensity: string) => void;
    isUpdate: boolean;
  } | null>(null);

  const [spaSettings, setSpaSettings] = useState<SpaSettings | null>(null);
  const downPaymentPercent = spaSettings?.downPayment ?? 30;

  const [employees, setEmployees] = useState<any[]>([]);
  const [availableBeds, setAvailableBeds] = useState<number>(0);

  useEffect(() => {
    getSpaSettings()
      .then((settings) => {
        setSpaSettings(settings);
        setAvailableBeds(settings?.totalRooms || 0);
      })
      .catch(console.error);

    getAllEmployees().then((data) => {
      setEmployees(data);
    });

    getAllServices().then((data) => {
      setAllServices(data);
      if (serviceId) {
        const selectedService = data.find((s) => s._id === serviceId);
        if (selectedService) {
          setServices([
            {
              service: selectedService,
              intensity: intensityParam || undefined,
            },
          ]);
        }
      }
    });
  }, [serviceId]);

  useEffect(() => {
    async function updateBeds() {
      if (!date) return;
      try {
        const data = await getAppointments({ status: "Approved" });
        const eventsOnDate = data.filter(
          (item) => item.date.split("T")[0] === date,
        ).length;
        const totalRooms = spaSettings?.totalRooms || 0;
          setAvailableBeds(Math.max(0, totalRooms - eventsOnDate));
      } catch {
        setAvailableBeds(0);
      }
    }
    updateBeds();
  }, [date, spaSettings]);

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

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  function isEmployeeAvailable(emp: any, selectedDate: string | null) {
    if (!selectedDate) return true; // Show as available when no date selected
    const dayOfWeek = dayjs(selectedDate).format("dddd").toLowerCase(); // "monday"
    if (!emp.schedule) return false;
    return emp.schedule.some((d: string) =>
      d.toLowerCase().includes(dayOfWeek),
    );
  }

  const navigate = useNavigate();

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

    if (active === 0 && services.length === 0) {
      return notifications.show({
        title: "No Services Selected",
        message: "Please select at least one service before continuing.",
        color: "yellow",
      });
    }

    if (active === 1 && (!date || !time)) {
      return notifications.show({
        title: "Incomplete Details",
        message: "Please select a date and time before continuing.",
        color: "yellow",
      });
    }

    // Create temporary appointments when moving from step 1 → 2
    if (active === 1 && tempAppointmentIds.length === 0) {
      const sessionToken = localStorage.getItem("session");
      if (!sessionToken)
        return navigate(
          `/sign-in?redirect=/book-appointment?serviceId=${serviceId}`,
        );

      const decoded = jwtDecode<DecodedToken>(sessionToken);
      const clientId = decoded.userId;

      try {
        setLoading(true);
        const appointment = await createAppointment({
          clientId,
          services: services.map((selected) => ({
            serviceId: selected.service._id,
            intensity: selected.intensity,
          })),
          date: date!,
          startTime: time,
          notes,
          isTemporary: true,
          employee: selectedEmployee ?? "",
        });
        setTempAppointmentIds([appointment._id]);
      } catch (err: any) {
        notifications.show({
          title: "Error",
          message: err.message || "Could not create temporary bookings.",
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
    // If going back from Step 3 → 2, delete temp appointments
    if (active === 2 && tempAppointmentIds.length > 0) {
      try {
        await Promise.all(
          tempAppointmentIds.map((id) => deleteAppointment(id)),
        );
        setTempAppointmentIds([]);
      } catch (err) {
        console.warn("Failed to delete temp appointments", err);
      }
    }
    setActive((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (services.length === 0 || !date || !time) return;

    try {
      setLoading(true);

      // Use tempAppointmentIds if they exist, otherwise create final appointment
      let appointmentIds = tempAppointmentIds;
      if (appointmentIds.length === 0) {
        const appointment = await createAppointment({
          clientId: getClientId(),
          services: services.map((selected) => ({
            serviceId: selected.service._id,
            intensity: selected.intensity,
          })),
          date,
          startTime: time,
          notes,
        });
        appointmentIds = [appointment._id];
      }

      if (paymentType === "Online") {
        // For multiple services, we might need to handle payment differently
        // For now, let's use the first appointment for payment
        const url = await createPaymongoPayment(appointmentIds[0], paymentMode);
        window.location.href = url;
      } else {
        await Promise.all(appointmentIds.map((id) => confirmAppointment(id)));
        notifications.show({
          title: "Appointments Booked!",
          message: "Your bookings have been saved. Please pay on site.",
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

    if (allServices.length === 0) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader size="lg" />
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
        size="xl"

      >
        <ScrollArea h={450}  className="border border-gray-300 p-3 rounded-xl">
          <Text size="xl" c="dimmed">
            <strong >Booking Policy:</strong>
            <br />• A <strong>{downPaymentPercent}% downpayment</strong> is
            required to confirm your booking.
            <br />• The downpayment or full payment is <strong>(REFUNDABLE upon cancellation)</strong>.<br />•
            Remaining <strong>{100 - downPaymentPercent}% balance</strong> must
            be paid before or on the day of the appointment.
            <br />
            • All appointments are subject to availability and are considered
            confirmed only after downpayment is received.
            <br />
              • Only <strong>(2) PENDING</strong> bookings are allowed for security purposes.
            <br />
              • <strong>Multiple Booking </strong> is allowed but only <strong> (1) TYPE OF SERVICE PER CATEGORY</strong> is permitted.
              <br />

            <br />
            <strong>Cancellation & Rescheduling:</strong>
            <br />• You may <strong>cancel</strong> an appointment only while it
            is still marked as <strong>Approved</strong>.<br />• You may{" "}
            <strong>reschedule</strong> an appointment if it is{" "}
              <strong>Approved.</strong>
            <br />
            • Cancellations or reschedule requests made less than 24 hours
            before the appointment may not be accommodated.
            <br />
            <strong>• Refunds</strong> are provided for cancellations.
            <br />
            <br />
            <strong>Late Arrival Policy:</strong>
            <br />• Arriving more than <strong>15 minutes late</strong> may
            result in a shortened session to avoid impacting other clients.
            <br />
            • Excessive delays may be treated as a no-show, resulting in
            forfeiture of any payments made.
            <br />

            <br />
            <strong>Health & Safety:</strong>
            <br />
            • Please inform your therapist of any medical conditions, injuries,
            allergies, or physical limitations before your session.
            <br />
            • The spa reserves the right to decline or modify treatment based on
            health concerns for client safety.
            <br />
            <br />
            <strong>Client Conduct & Etiquette:</strong>
            <br />
            • Respectful behavior toward staff and other clients is required at
            all times.
            <br />
            • Inappropriate or abusive behavior may result in the immediate
            termination of the session with no refund.
            <br />
            <br />
            <strong>Privacy & Confidentiality:</strong>
            <br />
            • All client information is kept confidential and is used only for
            booking and service purposes.
            <br />
            <br />
            <strong>Agreement:</strong>
            <br />
            • By checking the agreement box and proceeding with the booking, you
            acknowledge that you have read, understood, and agreed to all terms
            and conditions listed above.
            <br />
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

      {/* --- Intensity Selection Modal --- */}
        <Modal
            opened={!!intensityModal}
            onClose={() => setIntensityModal(null)}
            title={`Select Intensity for ${intensityModal?.service.name}`}
            size="sm"
        >
            <Select
                label="Intensity"
                placeholder="Choose intensity"
                data={
                    intensityModal?.service.intensity
                        ? intensityModal.service.intensity
                            .split(",")
                            .map((i) => i.trim())
                            .filter((i) => i)
                            .map((i) => ({ value: i, label: i }))
                        : []
                }
                onChange={(value) => {
                    if (value && intensityModal) {
                        intensityModal.onSelect(value);
                    }
                }}
            />
        </Modal>

      <Container size="lg" className="py-1">
        <div className="flex flex-col md:flex-col gap-10">
          {/* --- Selected Services Info --- */}
          <Card
            shadow="md"
            radius="md"
            withBorder
            className="flex-1 overflow-hidden bg-white/80 backdrop-blur-sm"
          >
            <Title order={4} mb="md">
              Selected Services
            </Title>
            <ScrollArea h={300}>
              <SimpleGrid cols={2} spacing="md">
                {services.map((selected) => (
                  <Card
                    key={selected.service._id}
                    withBorder
                    radius="md"
                    mb="sm"
                  >
                    <Group>
                      <div
                        style={{
                          height: 60,
                          width: 60,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          src={
                            selected.service.imageUrl || "/img/placeholder.jpg"
                          }
                          height="100%"
                          width="100%"
                          fit="contain"
                          alt={selected.service.name}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text fw={500}>{selected.service.name}</Text>
                        {selected.intensity && (
                          <Text size="sm" c="blue">
                            Intensity: {selected.intensity}
                          </Text>
                        )}
                        <Text size="sm" c="dimmed">
                          {selected.service.description}
                        </Text>
                        <Group justify="space-between">
                          <Text fw={600} size="sm">
                            ₱{selected.service.price}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {selected.service.duration} mins
                          </Text>
                        </Group>
                      </div>
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() =>
                          setServices((prev) =>
                            prev.filter(
                              (s) => s.service._id !== selected.service._id,
                            ),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </ScrollArea>
            <Divider my="md" />
            <Group justify="space-between">
              <Text fw={600}>
                Total Price: ₱
                {services
                  .reduce((sum, s) => sum + s.service.price, 0)
                  .toFixed(2)}
              </Text>
              <Text fw={600}>
                Total Duration:{" "}
                {services.reduce((sum, s) => sum + s.service.duration, 0)} mins
              </Text>
            </Group>
          </Card>

          {/* --- Booking Stepper --- */}
          <Card
            shadow="lg"
            radius="lg"
            withBorder
            className="flex-1 bg-white/80 backdrop-blur-sm relative"
          >
            <Title order={4} mb="md">
              Book Your Appointment
            </Title>

            <Stepper
              active={active}
              onStepClick={setActive}
              allowNextStepsSelect={false}
            >
              <Stepper.Step label="Select Services">
                <Text mb="md">Choose the services you want to book:</Text>
                <ScrollArea h={400}>
                  <SimpleGrid cols={2} spacing="md">
                    {allServices.map((s) => {
                      const isSelected = services.some(
                        (selected) => selected.service._id === s._id,
                      );
                      return (
                        <Card
                          key={s._id}
                          shadow={isSelected ? "lg" : "sm"}
                          radius="md"
                          withBorder
                          style={{
                            cursor: "pointer",
                            borderColor: isSelected ? "green" : undefined,
                          }}
                          onClick={() => {


                              const intensityOptions = s.intensity
                              ? s.intensity
                                  .split(",")
                                  .map((i) => i.trim())
                                  .filter((i) => i)
                              : [];
                              //show a modal that the service was already selected
                            if (isSelected) {

                                notifications.show({
                                    title: "Already Added",
                                    message: `${s.name} is already in your selected services.`,
                                    color: "yellow",
                                });
                                return;

                            } else {
                              if (intensityOptions.length > 0) {
                                // Add with intensity
                                setIntensityModal({
                                  service: s,
                                  onSelect: (intensity: string) => {
                                    setServices((prev) => [
                                      ...prev,
                                      { service: s, intensity },
                                    ]);
                                    setIntensityModal(null);
                                  },
                                  isUpdate: false,
                                });
                              } else {
                                // Add without intensity
                                setServices((prev) => [
                                  ...prev,
                                  { service: s },
                                ]);
                              }
                            }
                          }}
                        >
                          <Image
                            src={s.imageUrl || "/img/placeholder.jpg"}
                            height={120}
                            fit="contain"
                            alt={s.name}
                          />
                          <Text fw={500} size="sm" mt="xs">
                            {s.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {s.description}
                          </Text>
                          <Group justify="space-between" mt="xs">
                            <Text fw={600} size="sm">
                              ₱{s.price}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {s.duration} mins
                            </Text>
                          </Group>
                          {isSelected && (
                            <Badge color="green" size="sm" mt="xs">
                              Selected
                            </Badge>
                          )}
                        </Card>
                      );
                    })}
                  </SimpleGrid>
                </ScrollArea>
                {services.length > 0 && (
                  <Text mt="md" fw={600}>
                    Selected Services: {services.length} ( ₱
                    {services
                      .reduce((sum, s) => sum + s.service.price, 0)
                      .toFixed(2)}{" "}
                    total)
                  </Text>
                )}
              </Stepper.Step>

              <Stepper.Step label="Select Availability">
                <Group grow mb="md">
                  <Group grow mb="md">
                    <DateInput
                      label="Select Date"
                      placeholder="Pick a date"
                      value={date}
                      onChange={setDate}
                      minDate={new Date()} // min date is today
                    />
                    <TimePicker
                      label="Select Time"
                      value={time}
                      onChange={setTime}
                      format="12h"
                      withDropdown
                    />
                  </Group>
                </Group>

                <BookingCalendar
                  employee={employees.find((e) => e._id === selectedEmployee)}
                  onDateSelect={(selectedDate) => setDate(selectedDate)}
                  onAvailabilityChange={setAvailableBeds}
                />

                <Group grow mb="md">
                  <Box mb="md">
                    <Text fw={600} mb="xs">
                      Massage Therapist
                    </Text>
                    <SimpleGrid cols={4} spacing="md">
                      {employees.map((emp, index) => {
                        const statusUnavailable = emp.status === "unavailable";
                        const scheduleAvailable = date
                          ? isEmployeeAvailable(emp, date)
                          : true;

                        const canClick =
                          !statusUnavailable && scheduleAvailable;

                        return (
                          <Card
                            key={`${emp._id}-${index}`}
                            shadow={selectedEmployee === emp._id ? "lg" : "sm"}
                            radius="md"
                            withBorder
                            style={{
                              cursor: statusUnavailable
                                ? "not-allowed"
                                : "pointer",
                              opacity: canClick ? 1 : 0.5,
                              borderColor:
                                selectedEmployee === emp._id
                                  ? "green"
                                  : undefined,
                            }}
                            onClick={() => {
                              // ❌ Completely disabled if employee status unavailable
                              if (statusUnavailable) return;

                              // ⚠️ Available employee but not scheduled that day
                              if (date && !scheduleAvailable) {
                                notifications.show({
                                  title: "Unavailable",
                                  message: `${emp.name} does not work on ${dayjs(
                                    date,
                                  ).format("dddd, MMMM D")}`,
                                  color: "yellow",
                                });
                                return;
                              }

                              // ✅ Select employee
                              setSelectedEmployee(emp._id);
                            }}
                          >
                            <Box
                              style={{
                                width: "100%",
                                aspectRatio: "1 / 1",
                                overflow: "hidden",
                                borderRadius: 8,
                              }}
                            >
                              <Image
                                src={emp.imageUrl || "/img/placeholder.jpg"}
                                alt={emp.name}
                                fit="cover"
                                height="100%"
                                width="100%"
                              />
                            </Box>

                            <Text ta="center" size="sm" fw={500}>
                              {emp.name}
                            </Text>

                            <Badge
                              color={
                                statusUnavailable
                                  ? "gray"
                                  : scheduleAvailable
                                    ? "green"
                                    : "red"
                              }
                              size="sm"
                              mt="xs"
                              fullWidth
                            >
                              {statusUnavailable
                                ? "Unavailable"
                                : scheduleAvailable
                                  ? "Available"
                                  : "Unavailable"}
                            </Badge>
                          </Card>
                        );
                      })}
                    </SimpleGrid>
                    <Box mt="md">
                      <Text fw={600} mb="xs" ta="center">
                        Available Beds
                      </Text>

                      <Text
                        size="48px"
                        fw={700}
                        ta="center"
                        c={availableBeds === 0 ? "red" : "green"}
                        style={{ lineHeight: 1 }}
                      >
                          {availableBeds === 0 ? "No Available Beds" : availableBeds}
                      </Text>
                    </Box>
                  </Box>
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
                      { label: "Pay on Site", value: "Cash" },
                      { label: "Pay Online", value: "Online" },
                    ]}
                  />
                  {paymentType === "Online" && (
                    <SegmentedControl
                      fullWidth
                      value={paymentMode}
                      onChange={(v) =>
                        setPaymentMode(v as "Full" | "Downpayment")
                      }
                      data={[
                        { label: "Full Payment", value: "Full" },
                        {
                          label: `Downpayment (${downPaymentPercent}%)`,
                          value: "Downpayment",
                        },
                      ]}
                    />
                  )}
                </Stack>
              </Stepper.Step>

              <Stepper.Step label="Review & Confirm">
                <Stack>
                  <Text>
                    <b>Services:</b>
                  </Text>
                  {services.map((selected) => (
                    <Text key={selected.service._id} ml="md">
                      • {selected.service.name} - ₱{selected.service.price} (
                      {selected.service.duration} mins)
                      {selected.intensity &&
                        ` (Intensity: ${selected.intensity})`}
                    </Text>
                  ))}
                  <Text>
                    <b>Total Price:</b> ₱
                    {services
                      .reduce((sum, s) => sum + s.service.price, 0)
                      .toFixed(2)}
                  </Text>
                  <Text>
                    <b>Total Duration:</b>{" "}
                    {services.reduce((sum, s) => sum + s.service.duration, 0)}{" "}
                    mins
                  </Text>
                  <Text>
                    <b>Date:</b> {date}
                  </Text>
                  <Text>
                    <b>Time:</b> {time}
                  </Text>
                  <Text>
                    <b>Payment:</b> {paymentType} ({paymentMode})
                  </Text>
                </Stack>
              </Stepper.Step>

              <Stepper.Completed>
                <Text ta="center" fw={500} c="green">
                  Booking complete!
                </Text>
              </Stepper.Completed>
            </Stepper>

            {/* --- Bottom Buttons --- */}
            <Group
              justify="space-between"
              mt="xl"
              className="sticky bottom-0 py-4 border-t"
            >
              {active > 0 && (
                <Button variant="default" onClick={handleBack}>
                  Back
                </Button>
              )}
              {active < 2 ? (
                <Button onClick={handleNext} loading={loading}>
                  Next
                </Button>
              ) : (
                <Button
                  loading={loading}
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {paymentType === "Online"
                    ? "Proceed to Payment"
                    : "Confirm Booking"}
                </Button>
              )}
            </Group>
          </Card>
        </div>
      </Container>
    </>
  );
}
