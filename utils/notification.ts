const sendExpensePush = async (tokens: string[], message: string) => {
    const notifications = tokens.map((token) => ({
        to: token,
        title: "💸 New Expense Added",
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