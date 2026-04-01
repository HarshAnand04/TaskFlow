const API_URL = 'http://localhost:3000/api/tasks';

// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const taskList = document.getElementById('taskList');
    const modal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const closeBtn = document.querySelector('.close');
    const taskForm = document.getElementById('taskForm');
    const scoreCircle = document.getElementById('scoreCircle');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // --- Chatbot Elements ---
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const closeChat = document.getElementById('closeChat');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatBody = document.getElementById('chatBody');

    // --- Initial Load ---
    fetchTasks();

    // --- Event Listeners ---
    if(addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
    }

    window.onclick = (e) => { 
        if (e.target == modal) modal.style.display = 'none'; 
    };

    // Form Submit Handler
    if(taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newTask = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                status: document.getElementById('status').value
            };
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newTask)
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to create task');
                }

                const data = await response.json();
                console.log('Task created:', data);
                
                taskForm.reset();
                modal.style.display = 'none';
                fetchTasks(); // Refresh list
                alert('Task created successfully!');

            } catch (error) {
                console.error('Error:', error);
                alert('Failed to create task. Is the server running? \nError: ' + error.message);
            }
        });
    }

    // Filter Buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            try {
                const res = await fetch(API_URL);
                const tasks = await res.json();
                renderTasks(filter === 'all' ? tasks : tasks.filter(t => t.status === filter));
            } catch (err) {
                console.error("Filter error", err);
            }
        });
    });

    // --- Chatbot Logic ---
    if(chatToggle) chatToggle.addEventListener('click', () => chatWindow.classList.toggle('active'));
    if(closeChat) closeChat.addEventListener('click', () => chatWindow.classList.remove('active'));

    if(sendBtn) sendBtn.addEventListener('click', handleChat);
    if(userInput) userInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleChat(); });

    async function handleChat() {
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        userInput.value = '';

        setTimeout(() => {
            let response = "I'm not sure how to help with that. Try asking about 'tasks', 'stats', or 'help'.";
            const lowerText = text.toLowerCase();

            if (lowerText.includes('hello') || lowerText.includes('hi')) {
                response = "Hi there! Ready to be productive?";
            } else if (lowerText.includes('add task') || lowerText.includes('create')) {
                response = "Sure! Click the 'New Task' button at the top right to add one.";
            } else if (lowerText.includes('stats') || lowerText.includes('score')) {
                response = "Your productivity score is based on how many tasks you complete. Keep going!";
            } else if (lowerText.includes('help')) {
                response = "I can help you navigate. You can filter tasks, change priorities, or delete old ones.";
            } else if (lowerText.includes('delete') || lowerText.includes('remove')) {
                response = "To delete a task, click the trash icon on the specific task card.";
            }

            addMessage(response, 'bot');
        }, 600);
    }

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.classList.add('message', sender);
        div.innerText = text;
        chatBody.appendChild(div);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // --- Core Functions ---

    async function fetchTasks() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const tasks = await res.json();
            renderTasks(tasks);
            updateStats(tasks);
        } catch (error) {
            console.error("Could not connect to server. Is Node.js running?", error);
            taskList.innerHTML = `<p style="color:red; text-align:center;">Error connecting to server. Make sure 'node server.js' is running.</p>`;
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if(tasks.length === 0) {
            taskList.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No tasks found. Create one!</p>';
            return;
        }
        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card priority-${task.priority}`;
            card.innerHTML = `
                <div class="task-header">
                    <h3>${task.title}</h3>
                    <span class="task-status">${task.status}</span>
                </div>
                <p>${task.description}</p>
                <div class="task-actions">
                    <button class="action-btn" onclick="toggleStatus('${task._id}', '${task.status}')">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTask('${task._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(card);
        });
    }

    // Expose functions to window so HTML onclick attributes can find them
    window.toggleStatus = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'To Do' ? 'In Progress' : currentStatus === 'In Progress' ? 'Done' : 'To Do';
        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            fetchTasks();
        } catch (err) {
            alert("Failed to update task");
        }
    };

    window.deleteTask = async (id) => {
        if(confirm('Are you sure?')) {
            try {
                await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                fetchTasks();
            } catch (err) {
                alert("Failed to delete task");
            }
        }
    };

    function updateStats(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Done').length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        scoreCircle.innerText = `${percentage}%`;
    }
});