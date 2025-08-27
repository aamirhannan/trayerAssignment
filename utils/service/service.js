function handleEditAndDelete(req, res) {
    const { id } = req.params;
    const { name, email } = req.body;
    const user = users.find((user) => user.id === id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    user.name = name;
    user.email = email;
    res.json(user);
}


function handleCreate(req, res) {
    const { name, email } = req.body;
    const user = { id: users.length + 1, name, email };
    users.push(user);
    res.status(201).json(user);
}


function handleGetAll(req, res) {
    res.json(users);
}

function handleGetById(req, res) {
    const { id } = req.params;
    const user = users.find((user) => user.id === id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
}

function handleDelete(req, res) {
    const { id } = req.params;
    const user = users.find((user) => user.id === id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    users = users.filter((user) => user.id !== id);
    res.status(204).send();
}

function handleGetAll(req, res) {
    res.json(users);
}