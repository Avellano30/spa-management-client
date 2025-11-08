import { Modal, Table, Badge, Text, Button } from "@mantine/core";
import { useState } from "react";

export const PaymentHistoryModal = ({ payments }: any) => {
    const [opened, setOpened] = useState(false);

    return (
        <>
            <Button
                size="xs"
                fullWidth={true}
                variant="light"
                color="blue"
                onClick={() => setOpened(true)}
            >
                View Payments
            </Button>

            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title="Payment History"
                centered
                size="lg"
            >
                {payments.length ? (
                    <Table striped withTableBorder withColumnBorders>
                        <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                        </thead>
                        <tbody>
                        {payments.map((p: any) => (
                            <tr key={p._id}>
                                <td>{p.type}</td>
                                <td>₱{p.amount.toFixed(2)}</td>
                                <td>
                                    <Badge color={p.status === "Completed" ? "green" : "yellow"}>
                                        {p.status === "Completed" ? "PAID" : "PENDING"}
                                    </Badge>
                                </td>
                                <td>{new Date(p.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                        </tbody>
                    </Table>
                ) : (
                    <Text size="sm" c="dimmed">
                        No payments yet.
                    </Text>
                )}
            </Modal>
        </>
    );
};
