import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, Center, Loader, Title } from "@mantine/core";
import { getAppointments } from "../api/appointments";
import { getSpaSettings, type SpaSettings } from "../api/settings";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

interface Props {
  employee?: any;
  onDateSelect?: (date: string) => void;
  onAvailabilityChange?: (availableBeds: number) => void;
}

export default function BookingCalendar({
  employee: _employee,
  onDateSelect,
  onAvailabilityChange,
}: Props) {
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [spaSettings, setSpaSettings] = useState<SpaSettings | null>(null);

  useEffect(() => {
    load();
    getSpaSettings().then(setSpaSettings).catch(console.error);
  }, []);

  const load = async () => {
    try {
        const [approved, rescheduled] = await Promise.all([
            getAppointments({ status: "Approved" }),
            getAppointments({ status: "Rescheduled" }),
        ]);
        const data = [...approved, ...rescheduled];


        const formatted = data.map((item) => {
        const [date] = item.date.split("T");
        const start12 = to12Hour(item.startTime);
        const end12 = to12Hour(item.endTime);

        return {
          title: `${start12} - ${end12}`, // now in 12-hour format
          start: `${date}T${item.startTime}:00`, // keep original ISO for FullCalendar
          end: `${date}T${item.endTime}:00`,
          color: "red",
          extendedProps: {
            employee: `${item.employee}`,
          },
        };
      });

      setBookings(formatted);
    } catch (err: any) {
      showNotification({ color: "red", title: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: "70vh" }}>
        <Loader size="lg" />
      </Center>
    );
  }

  function to12Hour(time24: string) {
    const [hourStr, minute] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12; // convert 0 → 12
    return `${hour}:${minute} ${ampm}`;
  }

  return (
    <Card shadow="sm" padding="lg" radius="md">
      <Title order={3} mb="md">
        Calendar
      </Title>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        validRange={{
          start: dayjs().startOf("day").format("YYYY-MM-DD"),
        }}
        events={bookings}
        dateClick={(arg) => {
          // Count events on this date
          const eventsOnDate = Array.isArray(bookings)
            ? bookings.filter((event) => event.start.startsWith(arg.dateStr))
                .length
            : 0;

          const totalRooms = spaSettings?.totalRooms || 0;
          const availableBeds = totalRooms - eventsOnDate;

          // showNotification({
          //   title: `Availability for ${dayjs(arg.date).format("MMMM D, YYYY")}`,
          //   message: `${eventsOnDate} bookings, ${availableBeds} beds available`,
          //   color: availableBeds > 0 ? "green" : "red",
          // });

          if (onAvailabilityChange) {
            onAvailabilityChange(availableBeds);
          }

          if (onDateSelect) {
            onDateSelect(arg.dateStr);
          }
        }}
        height="80vh"
        editable={false}
        selectable={true}
        displayEventTime={false}
      />
    </Card>
  );
}
