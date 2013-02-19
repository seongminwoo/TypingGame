var http = require('http');
var fs = require('fs');
var socketio = require('socket.io');
var qs = require('querystring');

// 게임에 사용할 변수
var sentences = ["바람이 불어오는 곳","그곳으로 가네","그대의 머릿결 같은 나무 아래로","덜컹이는 기차에 기대어", "너에게 편지를 쓴다","꿈에 보았던 길","그 길에 서있네","설레임과 두려움으로","불안한 행복이지만","우리가 느끼며 바라볼 하늘과 사람들","힘겨운 날 들도 있지만","새로운 꿈 들을 위해","바람이 불어 오는 곳 그 곳으로 가네","햇살이 눈부신 곳 그 곳으로 가네","바람에 내 몸 맡기고 그 곳으로 가네", "출렁이는 파도에 흔들려도","수평선을 바라보며","햇살이 웃고 있는 곳","그 곳으로 가네","나뭇잎이 손짓하는 곳 그 곳으로 가네","휘파람 불며 걷다가 너를 생각해","너의 목소리가 그리워도 뒤돌아 볼 수 는 없지","바람이 불어 오는 곳 그 곳으로 가네"];
var userAnswers = "";
var round=0;
var count = -1;
var second = 0;
var startTime;
var answerNum = 0;
var grade = 0;
var roundTime = 40;
var alertTime = 3;
var limitTime = 20;
var FirstVisitHelp="타자게임설명 : 매 라운드 마다 파란색 한 문장이 주어집니다. 라운드는 " + roundTime + "초 마다 진행이 되고, " + limitTime + "초 안에 문장을 입력해야만 합니다. 문장 입력 기회는 한번 뿐이고 정확도가 100% 이면서 빨리 입력한 사람이 순위가 높습니다.";


// webserver
var server = http.createServer(function(req, res) {
	//client ui
	fs.readFile('chatclient.html', function(err, data) {
		res.writeHead(200, {'Content-Type':'text/html'});
		res.end(data);
	});
}).listen(9999, function() {
	console.log("Server is running!");
});

// socketio
var serverSocket = socketio.listen(server); //http server와 연결된 socketio 소켓 객체

serverSocket.set('log level',2); //불필요한 로그제거

/* 사용자 타자정확도 계산 함수*/
var getAccuracy = function(original, answer) {
	var orgCnt = original.length;
	var ansCnt = answer.length;
	var errCnt = 0;

	for(var i =0; i<orgCnt; i++) {
		if(i > ansCnt -1) {
			break;
		}

		if(original.charAt(i) != answer.charAt(i)) {
			errCnt++;
		}
	}

	errCnt = errCnt + Math.abs(orgCnt-ansCnt);
	var accuracy = ((orgCnt - errCnt) / orgCnt) * 100;
	if (accuracy < 0)
	{
		accuracy = 0;
	}

	accuracy = roundXL(accuracy, 2);

	return accuracy + "%";
};

// 엑셀 스타일의 반올림 함수 정의
function roundXL(n, digits) {
  if (digits >= 0) return parseFloat(n.toFixed(digits)); // 소수부 반올림

  digits = Math.pow(10, digits); // 정수부 반올림
  var t = Math.round(n * digits) / digits;

  return parseFloat(t.toFixed(0));
}


/*
  * 소켓 통신의 종류
  * 1. public : 자신을 포함한 모든 클라이언트에 데이터를 전달합니다.
  * 2. broadcast : 자신을 제외한 모든 클라이언트에 데이터를 전달합니다.
  * 3. private : 특정 클라이언트에게 데이터를 전달합니다.
  * 
  *  public => serverSocket.sockets.emit('이벤트명', data);
  *  broadcast => socket.broadcast.emit('이벤트명', data);
  *  private => serverSocket.sockets['id'].emit('이벤트명',data);
  */

/*socket.io 통신 메시지 처리*/
serverSocket.sockets.on('connection', function(socket){//이 socket이 클라이언트와 연결된 소켓이다.
	//서버소켓은 클라이언트의 접속을 기다리고 있다가 클라이언트가 소켓 접속을 하면 'connection' 이벤트가 일어난다.
	var socketid = socket.id;
	console.log("소켓아이디: ", socketid);
	var userName = "아무게";

	socket.emit('newMessage', FirstVisitHelp);

	socket.on('disconnect', function() {
		if( userName != "아무게") {
			serverSocket.sockets.emit('newMessage', userName + "님이 퇴장하셨습니다.");
		}
	});
	
	socket.on('sendUserName', function(data) {
		 // 채팅 이벤트가 발생하면 public 통신으로 data를 모든 클라이언트에 제공한다.
		userName = data;
		serverSocket.sockets.emit('newMessage', userName + "님이 입장하셨습니다.");
	});

	socket.on('sendChatMessage', function(data) {
		 // 채팅 이벤트가 발생하면 public 통신으로 data를 모든 클라이언트에 제공한다.
		serverSocket.sockets.emit('newMessage', data);
	});

	socket.on('sendGameMessage', function(data) {
		console.log(data);
		serverSocket.sockets.emit('otherTypingMessage', data);
		
		var dataSplit = data.split(':');

		var name = dataSplit[0];
		var answer = dataSplit[1];
		
		console.log("name : " + name);
		console.log("answer : " + answer);

		var accuracy = "";
		if (answer == sentences[count])
		{
			accuracy = "100%";
		} else {
			accuracy = getAccuracy(sentences[count],answer);			
		}

		console.log("accuracy : " + name);

		var currentTime = new Date();
		var time = currentTime - startTime;
		console.log("currentTime : " + currentTime);
		console.log("startTime : " + startTime);
		console.log("time(ms) : " + time);

		time = roundXL(time/1000, 2);
		console.log("time(s) : " + time);

		
		answerNum++;

		var userGrade = 0;

		if (accuracy == "100%")
		{
			userGrade = ++grade;
		}
		
		var result = '{"name":"' + name + '","grade":' + userGrade + ',"answer":"' + answer + '","accuracy":"' + accuracy + '","time":' + time + '}';

		console.log(result);
		
		// 사용자가 답변한 메시지의 정확도,시간,등수 정보를 배열에 저장해 놓는다.
		if(userAnswers.length != 0 ) {
			userAnswers = userAnswers + "," + result;
		} else {
			userAnswers = result;
		}
		
	});

});

/* 타자게임 루프 */
setInterval(function() {
	serverSocket.sockets.emit('controlMessage', 'start');
	startTime = new Date();
	round++;
	console.log(round + "라운드");
	console.log("startTime : " + startTime);
	count = (count+1)%23;
	console.log(sentences[count]);
	serverSocket.sockets.emit('typingMessage', sentences[count]);
	

	setTimeout(function() {
		serverSocket.sockets.emit('controlMessage', 'alertStop');
	}, (limitTime-alertTime) * 1000);
	
	// 20초뒤에 문제 마감
	setTimeout(function() {
		serverSocket.sockets.emit('controlMessage', 'stop');
		if (answerNum > 1) {
			userAnswers = "[" + userAnswers + "]";
		} else if(answerNum == 0) {
			userAnswers = "{}";
		}
		
		console.log(userAnswers);
		serverSocket.sockets.emit('controlMessage', '{"answerNum":' + answerNum + ',"userAnswers":' + userAnswers + "}");
		userAnswers = "";
		answerNum = 0;
		grade = 0;
	}, limitTime * 1000);

	setTimeout(function() {
		serverSocket.sockets.emit('controlMessage', 'alertStart');
	}, (roundTime-alertTime) * 1000);

	// 20초 휴식
}, roundTime * 1000)