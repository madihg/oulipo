Intro to Socket.io
====================
[Socket.io](http://socket.io) is a javascript library that runs in both the browser and server to allow realtime communication between the two. This allows for collaborative web experiences where many people can interact on the same page, all without using a cumbersome database or even much backend code.

Socket.io does this by having both a client-side and a server-side library which communicate with each other through named events that pass between the two (similar to the way keyboard and mouse events are handled).

Below is a rough guide to how socket.io works on the client side and on the server side, and how the two communicate.

#### Client Side
On the client side, the socket.io client library needs to be included in the HTML:
```javascript
<script src= 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.js'></script>
```
And the following line needs to be included at the top of your client.js file:
```javascript
var socket = io()
```
The client can then send messages to the server in the following form
```javascript
//the function takes a string and then an object full of data (any size)
socket.emit('nameOfEvent', {data: "data you are sending to the server"})
```
And the client can listen for messages from the server like so:
```javascript
socket.on('nameOfServerEvent', function(data){
  //the code you want to use on the data sent back from the server
}
```

#### Server Side
Just about all of your socket.io programs are going to want the following boilerplate in the server.js file.
```javascript
var socket = require('socket.io');
var io = socket(server);

io.sockets.on('connection', newConnection);

//This function will be called whenever a new web browser visits the page. It runs as soon as a connection is set up with the server.
function newConnection(socket){
	console.log('new connection: ' + socket.id)
	//we put all the rest of our code inside that connection, because we only want it to run once we're connected
  //this section will have one or more event listeners that line up with various things that can happen on the client side (like sending a message in a chat app)
	socket.on('myEvent', myEventHandler);
	function myEventHandler(data){
    //what you do in response to the event goes here
    //often you'll want one of the four 'emit' events listed below
    socket.broadcast.emit('myServerEvent', data);
		
	}
}
```

**Server Side Cheat Sheet**
```javascript
// sending to sender-client only
  socket.emit('message', "this is a test");

 // sending to all clients, include sender
  io.emit('message', "this is a test");

 // sending to all clients except sender
  socket.broadcast.emit('message', "this is a test");

 // sending to individual socketid
  socket.broadcast.to(socketid).emit('message', 'for your eyes only');
```




#### Message Passing Example: Chat Room
A user logs into a chat room using socket.io. Once the page loads a connection is established, giving the user a unique id and trigger the newConnection function through the following part of the server code 
```javascript
io.sockets.on('connection', newConnection);
function newConnection(socket){
 //...
}
```
The user enters their username on the client, and then types and sends a message into the chatroom. The following client-side code sends the message:
```javascript
socket.emit('newMsg', {username:username, msg:msg});
```
This is then handled by the appropriate handler on the server (with the matching name)
```javascript
function newConnection(socket){
   socket.on('newMsg', function(data){
     //the same data from the client is sent to all other clients
     socket.broadcast.emit('newMsgFromServer', data)
   }
}
```
The server receives the message and then sends it out to all other connected clients. This message from the server is then handled by the following code on the client:
```javascript

socket.on('newMsgFromServer', function(data){
	addMsg(data.username, data.msg)
})
//This function uses jQuery to add the message to the HTML
function addMsg(user, msg){
	$('#messages').append("<p><strong>"+user+": </strong>"+msg+"</p>")
}
```