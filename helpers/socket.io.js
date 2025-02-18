import { Server } from 'socket.io';

let io;

let connectedIdList = [];
let userList = [];

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'https://spacehub.site'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    connectedIdList = connectedIdList.filter(connectedId => connectedId !== socket.id);
    connectedIdList.push(socket.id);

    socket.on('register', (user) => {
      userList = userList.filter(user => user.connectedId !== socket.id);
      userList.push({
        id: user ? user.id : null,
        role: user ? user.role: null,
        connectedId: socket.id
      });
    });

    socket.on('disconnect', () => {
      connectedIdList = connectedIdList.filter(connectedId => connectedId !== socket.id);
      userList = userList.filter(user => user.connectedId !== socket.id);
    });
  });

  return io;
}

export function getSocket() {
  if (!io) {
    throw new Error('Socket.io khong ton tai, goi initSocket truoc');
  }
  return io;
}

export function getUserList() {
  return userList;
}

