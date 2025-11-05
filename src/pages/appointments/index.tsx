import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Table,
  Group,
  Badge,
  Select,
  Flex,
  Title,
  Textarea,
  Card,
  ScrollArea,
  Text,
  Center,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  getClientAppointments,
  cancelAppointment,
  rescheduleAppointment,
  type Appointment,
} from "../../api/appointments";
import { DateInput, TimePicker } from "@mantine/dates";
import { IconRefresh } from "@tabler/icons-react";

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filtered, setFiltered] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string | undefined>(undefined);
  const [newNotes, setNewNotes] = useState("");

  const load = async () => {
    try {
      const data = await getClientAppointments();
      setAppointments(data);
    } catch (err: any) {
      showNotification({ color: "red", title: "Error", message: err.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let temp = [...appointments];
    if (statusFilter !== "All") temp = temp.filter((a) => a.status === statusFilter);
    setFiltered(temp);
  }, [statusFilter, appointments]);

  const handleAction = async (id: string, action: Function, successMsg: string) => {
    try {
      await action(id);
      showNotification({ color: "green", title: "Success", message: successMsg });
      load();
    } catch (err: any) {
      showNotification({ color: "red", title: "Error", message: err.message });
    }
  };

  const handleReschedule = async () => {
    if (!selected || !newDate || !newTime)
      return showNotification({
        title: "Incomplete",
        message: "Please select both a new date and time.",
        color: "yellow",
      });

    try {
      await rescheduleAppointment(
        selected._id,
        newDate,
        newTime,
        newNotes
      );
      showNotification({
        color: "green",
        title: "Rescheduled",
        message: "Your appointment has been successfully rescheduled.",
      });
      setRescheduleModal(false);
      load();
    } catch (err: any) {
      showNotification({ color: "red", title: "Error", message: err.message });
    }
  };

  return (
    <div className="p-6">
      {/* HEADER + FILTERS */}
      <Flex justify="space-between" align="center" mb="lg" className="flex-wrap gap-3">
        <Title order={2} className="font-semibold">
          My Appointments
        </Title>
        <Group>
          <Select
            placeholder="Filter status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v || "All")}
            data={["All", "Pending", "Approved", "Completed", "Cancelled", "Rescheduled"]}
            w={160}
          />
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={load}
          >
            Refresh
          </Button>
        </Group>
      </Flex>

      {/* TABLE */}
      <Card shadow="sm" radius="md" withBorder p="0" className="overflow-hidden">
        <ScrollArea>
          <Table striped highlightOnHover withColumnBorders verticalSpacing="sm">
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Service</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Time</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Notes</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.length > 0 ? (
                filtered.map((a) => (
                  <Table.Tr key={a._id}>
                    <Table.Td>{a.serviceId.name}</Table.Td>
                    <Table.Td>{new Date(a.date).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      {a.startTime} - {a.endTime}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(a.status)} variant="filled">
                        {a.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                        {a.notes || "-"}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {(a.status === "Pending" || a.status === "Approved") && (
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            onClick={() => handleAction(a._id, cancelAppointment, "Appointment cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                        {(a.status === "Approved" || a.status === "Rescheduled") && (
                          <Button
                            size="xs"
                            variant="outline"
                            color="blue"
                            onClick={() => {
                              setSelected(a);
                              setRescheduleModal(true);
                              setNewDate(null);
                              setNewTime(undefined);
                              setNewNotes("");
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Center py="xl">
                      <Text c="dimmed">No appointments found</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* RESCHEDULE MODAL */}
      <Modal
        opened={rescheduleModal}
        onClose={() => setRescheduleModal(false)}
        title={`Reschedule: ${selected?.serviceId.name || ""}`}
        centered
        size="md"
      >
        <Text size="sm" mb="sm" c="dimmed">
          Choose a new date and time for your appointment.
        </Text>

        <Group grow mb="md">
          <DateInput
            label="New Date"
            value={newDate}
            onChange={setNewDate}
            minDate={new Date()}
          />
          <TimePicker
            label="New Start Time"
            value={newTime}
            onChange={setNewTime}
            format="12h"
            withDropdown
          />
        </Group>

        <Textarea
          label="Notes (optional)"
          placeholder="Add any notes for this reschedule..."
          minRows={3}
          value={newNotes}
          onChange={(e) => setNewNotes(e.currentTarget.value)}
          mb="md"
        />

        <Button fullWidth onClick={handleReschedule}>
          Save Changes
        </Button>
      </Modal>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "Pending":
      return "yellow";
    case "Approved":
      return "blue";
    case "Completed":
      return "green";
    case "Cancelled":
      return "red";
    case "Rescheduled":
      return "orange";
    default:
      return "gray";
  }
}
