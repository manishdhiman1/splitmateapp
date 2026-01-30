import * as Notifications from "expo-notifications";

const sendExpensePush = async (tokens: string[], message: string, title: string = "💸 New Expense Added") => {
    const notifications = tokens.map((token) => ({
        to: token,
        title: title,
        body: message,
        sound: "default",
        data: {
            type: "expense",
            groupId: "GROUP_ID",
        },
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(notifications),
    });
};


export default sendExpensePush;


export async function scheduleFixedReminder(reminder: {
    name: string;
    message?: string;
    time: string;
    repeatDays: number[]; // 0–6 (Mon–Sun)
}) {
    const ids: string[] = [];
    const { hour, minute } = parseTime(reminder.time);

    for (const day of reminder.repeatDays) {
        const weekday = day === 6 ? 1 : day + 2;
        // Expo weekday: 1=Sun, 2=Mon ... 7=Sat
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: reminder.name,
                body: reminder.message || "Reminder",
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                weekday,
                hour,
                minute,
                repeats: true, // THIS makes it day-based recurring
            },
        });

        ids.push(id);
    }

    return ids; // multiple IDs
}


export async function scheduleIntervalReminder(reminder: any) {
    const notificationId =
        await Notifications.scheduleNotificationAsync({
            content: {
                title: reminder.name,
                body: reminder.message || "Reminder",
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: reminder.intervalMinutes * 60,
                repeats: true,
            },
        });

    return notificationId;
}



export async function deleteReminderNotification(notificationId: any) {
    await Notifications.cancelScheduledNotificationAsync(
        notificationId
    );
}

const getNextTriggerDate = (time: string, repeatDays: number[]) => {
    const { hour, minute } = parseTime(time);
    const now = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(now.getDate() + i);
        date.setHours(hour, minute, 0, 0);

        const dayIndex = (date.getDay() + 6) % 7; // convert Sun→6

        if (
            repeatDays.length === 0 ||
            repeatDays.includes(dayIndex)
        ) {
            if (date > now) return date;
        }
    }

    return null;
};

const parseTime = (time: string) => {
    const [t, period] = time.split(" ");
    let [hour, minute] = t.split(":").map(Number);

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return { hour, minute };
};