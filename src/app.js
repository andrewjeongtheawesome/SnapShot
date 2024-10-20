// Firestore 초기화 (index.html에서 이미 firebase가 초기화되었으므로, 바로 사용)
import { db } from '../src/firebaseConfig.js';

let bottleCap;
let triesLeft = 3;  // 병뚜껑 남은 개수
let highestScore = 10000;  // 최고 기록
let isDragging = false;
let slingshotLine;
let camera;
let isBottleCapStopped = false;
let gameScene;
let selectedCap = localStorage.getItem('selectedCap'); // 선택된 병뚜껑 이름 불러오기

let tableHeight = 4000;  // 테이블 높이를 상단에서 바로 초기화
let slingshotAnchorX = 600;  // 새총 기준 위치
let slingshotAnchorY = tableHeight - 50;  // 새총 기준 높이
let bottleCapOriginalY = tableHeight - 200;  // 병뚜껑 위치
let finishLineY = 50;  // 끝 라인의 Y 좌표를 전역으로 선언
let pullSound, releaseSound, endSound, fallSound;

// Phaser 게임 설정
function startPhaserGame() {
    let config = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1000,  // 가로 길이 고정 (테이블 길이에 맞춤)
            height: window.innerHeight,  // 세로 길이는 반응형으로 설정
        },
        parent: 'phaser-game',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    console.log(selectedCap);
    new Phaser.Game(config);
}


function preload() {
    this.load.audio('pull', 'sounds/pull.mp3');  // 새총을 당길 때
    this.load.audio('release', 'sounds/release.mp3');  // 새총을 놓을 때
    this.load.audio('end', 'sounds/end.mp3');  // 병뚜껑이 멈출 때
    this.load.audio('fall', 'sounds/fall.mp3');  // 병뚜껑이 테이블 밖으로 나갔을 때
    const selectedCap = localStorage.getItem('selectedCap'); // 저장된 병뚜껑 경로 불러오기
    this.load.image('bottlecap', selectedCap); // 선택된 병뚜껑 로드
    this.load.image('table', 'pics/table.jpg');  // 테이블 이미지
    this.load.image('bolt', 'pics/bolt.png');
}

let gameOver = false;  // 게임 종료 여부

function create() {
    gameScene = this;  // 전역 변수로 장면 컨텍스트 저장

    pullSound = this.sound.add('pull');
    releaseSound = this.sound.add('release');
    endSound = this.sound.add('end');
    fallSound = this.sound.add('fall');

    // 배경을 흰색으로 설정
    this.cameras.main.setBackgroundColor('#ffffff');
    
    // 테이블 이미지 스케일을 조정하여 테이블 크기에 맞게 확장
    // let table = this.add.image(500, tableHeight / 2, 'table');  // 테이블 이미지 배치
    // table.setScale(1, tableHeight / table.height);  // 테이블 이미지를 높이에 맞게 스케일링

    // 테이블 이미지 스케일을 조정하여 테이블 크기에 맞게 확장
    let table = this.add.image(500, tableHeight / 2, 'table');
    table.setScale(window.innerWidth / table.width, tableHeight / table.height);  // 가로와 세로 스케일 모두 맞춤

    // graphics 객체 선언
    let graphics = this.add.graphics(); // 안전 영역과 테이블을 그릴 수 있도록 graphics 선언

    // 안전 영역을 진한 회색으로 그리기
    graphics.fillStyle(0x919497, 1);  // 진한 회색
    let safeZoneX1 = 0; // A 부분의 왼쪽 X 좌표
    let safeZoneX2 = 1000; // A 부분의 오른쪽 X 좌표
    let safeZoneY1 = tableHeight; // A 부분의 상단 Y 좌표
    let safeZoneY2 = tableHeight + 1000; // A 부분의 하단 Y 좌표 (여유 공간)

    graphics.fillRect(safeZoneX1, safeZoneY1, safeZoneX2 - safeZoneX1, safeZoneY2 - safeZoneY1);  // 안전 영역 그리기

    // 병뚜껑 및 새총의 위치 설정 (테이블 하단에 위치하도록 조정)
    //this.add.image(500, 3000, 'table');  // 테이블 이미지 배경 설정
    bottleCap = this.physics.add.sprite(slingshotAnchorX - 100, bottleCapOriginalY, 'bottlecap');
    bottleCap.setScale(0.6);
    bottleCap.setCollideWorldBounds(false);  // 테이블 끝에서 벗어날 수 있도록 설정
    bottleCap.setInteractive();
    
    // 마찰력 추가
    bottleCap.body.setDrag(800);  // X축과 Y축 모두에서 마찰력을 설정
    bottleCap.body.setBounce(0.8);  // 병뚜껑이 충돌 시 반동

    // 병뚜껑 개수, 최고 기록, 현재 위치 표시 바
    // bottleCountText = this.add.text(20, 100, `병뚜껑 x${triesLeft}`, { fontSize: '24px', fill: '#000' });
    // highestScoreText = this.add.text(1000, 20, `최고 기록: ${highestScore}cm`, { fontSize: '24px', fill: '#000' });

    // 카메라를 병뚜껑에 따라가도록 설정
    camera = this.cameras.main;
    camera.setBounds(0, 0, 1000, tableHeight + 500);  // 카메라 범위를 낭떠러지 끝까지 설정
    camera.startFollow(bottleCap, true, 0.05, 0.05);  // 부드러운 카메라 이동

    // 고무줄 생성 및 새총 끝 검은 원 추가 (테이블 끝쪽에 배치)
    slingshotLine = this.add.graphics();
    slingshotLine.lineStyle(4, 0xea9f0c, 1);
    updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);

    // 고무줄 양쪽의 동그라미를 bolt 이미지로 교체
    this.add.image(slingshotAnchorX - 200, slingshotAnchorY, 'bolt').setScale(0.05);
    this.add.image(slingshotAnchorX, slingshotAnchorY, 'bolt').setScale(0.05);

    // 병뚜껑 드래그 및 발사
    this.input.setDraggable(bottleCap);

    this.input.on('dragstart', function (pointer, gameObject) {
        isDragging = true;
        pullSound.play();
    });

    this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
        // gameObject.setAngularVelocity(150);
        if (isDragging && dragY > slingshotAnchorY) {
            gameObject.x = dragX;
            gameObject.y = dragY;
            updateSlingshotLine(dragX, dragY);
        }
    });

    // 병뚜껑 드래그 및 발사
    this.input.on('dragend', function (pointer, gameObject) {
        releaseSound.play()
        if (isDragging) {
            // 병뚜껑을 당긴 반대 방향으로 속도 벡터를 설정
            let velocityX = -(gameObject.x - slingshotAnchorX + 100) * 6;  // 좌우 방향 반전
            let velocityY = (gameObject.y - slingshotAnchorY) * 6;  // 상하 방향 반전
            gameObject.body.setVelocity(velocityX, -velocityY);  // 발사

            // 병뚜껑 회전 추가 (날아가는 동안 회전)
            gameObject.setAngularVelocity(100);  // 병뚜껑에 회전 효과 추가

            updateSlingshotLine(slingshotAnchorX, slingshotAnchorY);
            isDragging = false;

            // 발사 직후 실시간으로 현재 거리 표시 시작
            let updateDistanceInterval = setInterval(() => {
                let currentDistance = Math.abs(bottleCap.y - finishLineY);
                document.getElementById("current-distance").innerText = `${currentDistance.toFixed(3)} cm`;
                
                // 병뚜껑이 멈췄거나 게임이 종료되면 실시간 업데이트 중지
                if (bottleCap.body.speed < 10 || gameOver) {
                    clearInterval(updateDistanceInterval);  // 실시간 거리 업데이트 중지
                }
            }, 100);  // 100ms마다 업데이트
        }
    });

    // 병뚜껑 이미지 설정 (남은 병뚜껑 아이콘 업데이트)
    updateCapsUI();


    // 점수 계산을 위한 끝 라인 설정 (테이블 상단)
    //let finishLineY = 50;  // 끝 라인의 Y 좌표 (화면 위쪽)
    let finishLine = this.add.line(400, finishLineY, 0, 0, 1200, 0, 0xff0000);  // 빨간색으로 라인 표시
}

// 병뚜껑 멈춤 후 2초 후에 다음 턴으로 넘어가는 코드
function handleBottleCapAction() {
    triesLeft -= 1;
    updateCapsUI();  // 병뚜껑 UI 업데이트

    let distanceFromFinish = Math.abs(bottleCap.y - finishLineY).toFixed(5);  // 소수점 5자리로 표시
    console.log(distanceFromFinish);

    // 최고 기록을 갱신할 때, 초기 값이거나 더 작은 값이 나오면 갱신
    if (highestScore === 0 || parseFloat(distanceFromFinish) < highestScore || highestScore >= 10000) {
        highestScore = parseFloat(distanceFromFinish);  // 문자열을 숫자로 변환하여 저장
        updateBestScoreUI();  // 최고 기록이 갱신되었으므로 반드시 호출
    }

    if (bottleCap.y > tableHeight - 100) {  // 병뚜껑이 테이블 위에 있는지 확인
        if (bottleCap.x < 500 || bottleCap.x > 700) {  // 낙 처리
            setTimeout(() => resetBottleCap(false), 1000);  // 2초 후에 다음 턴으로 넘어감
        } else {
            // 정상 발사 완료, 2초 대기 후 초기화
            setTimeout(() => resetBottleCap(true), 1000);
        }
    } else {
        setTimeout(() => resetBottleCap(false), 1000);  // 범위 밖일 경우도 2초 대기 후 초기화
    }
}

import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js";

// 최고 기록 업데이트 함수
async function updateHighestScore(studentId, newScore) {
    const userRef = doc(db, "users", studentId);  // Firestore 문서 참조
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const currentHighestScore = userDoc.data().highestScore || 0;

        if (parseFloat(newScore) > parseFloat(currentHighestScore)) {  // float으로 변환 후 비교
            try {
                await updateDoc(userRef, {
                    highestScore: parseFloat(newScore)  // float으로 변환하여 저장
                });
                console.log("최고 기록이 성공적으로 업데이트되었습니다.");
            } catch (error) {
                console.error("최고 기록 업데이트 중 오류 발생: ", error);
            }
        }
    } else {
        console.error("사용자 문서를 찾을 수 없습니다.");
    }
}

// 게임이 끝나면 hasPlayed를 true로 설정하는 함수
async function updateHasPlayed(studentId) {
    const userRef = doc(db, "users", studentId);
    try {
        await updateDoc(userRef, {
            hasPlayed: true
        });
        console.log("hasPlayed가 true로 업데이트되었습니다.");
    } catch (error) {
        console.error("hasPlayed 업데이트 중 오류 발생: ", error);
    }
}

function update() {
    if (gameOver) return;  // 게임 종료 시 더 이상 업데이트 하지 않음
    // 병뚜껑이 발사된 후에만 실시간으로 현재 병뚜껑과 결승선 간의 거리를 계산
    // 병뚜껑이 발사된 후에만 실시간으로 현재 병뚜껑과 결승선 간의 거리를 계산
    if (!isDragging && bottleCap.body.velocity.length() > 0) {
        let currentDistance = Math.abs(bottleCap.y - finishLineY);
        document.getElementById('current-distance').innerText = `${currentDistance.toFixed(5)} cm`;

        // 병뚜껑의 속도에 따라 회전 속도를 서서히 줄임
        let velocityMagnitude = bottleCap.body.velocity.length();  // 병뚜껑의 속도 크기
        let angularVelocity = bottleCap.body.angularVelocity;  // 병뚜껑의 회전 속도

        // 병뚜껑이 충분히 느려지고 멈췄는지 감지
        if (velocityMagnitude < 5 && Math.abs(angularVelocity) < 5 && !isBottleCapStopped) {
            isBottleCapStopped = true;
            endSound.play();  // 병뚜껑이 멈췄을 때 소리 재생

            // 2초 후에 다음 턴으로 넘어가는 타이머 설정
            setTimeout(() => {
                handleBottleCapAction();  // 병뚜껑이 멈춘 후 기록 갱신 및 처리
                if (triesLeft <= 0) {
                    endGame();  // 남은 병뚜껑이 없으면 게임 종료
                }
            }, 1000);  // 1초 대기 후 다음 턴으로 넘어감
        }

        // 병뚜껑이 이동 중일 때 서서히 회전 속도를 줄임
        if (velocityMagnitude > 5) {
            bottleCap.setAngularVelocity(angularVelocity * 0.99);  // 회전 속도를 서서히 줄임
        } else {
            bottleCap.setAngularVelocity(0);  // 속도가 매우 느리면 회전을 완전히 멈춤
        }
    }

    // A 부분의 안전 영역 범위 설정 (X 좌표와 Y 좌표 범위 지정)
    let safeZoneX1 = 150; // A 부분의 왼쪽 X 좌표
    let safeZoneX2 = 1050; // A 부분의 오른쪽 X 좌표
    let safeZoneY1 = tableHeight; // A 부분의 상단 Y 좌표
    let safeZoneY2 = tableHeight + 1500; // A 부분의 하단 Y 좌표 (여유 공간)

    // 병뚜껑이 테이블 밖으로 나가는지 확인 (A 부분은 낙 처리에서 제외)
    if ((bottleCap.x < 200 || bottleCap.x > 800 || bottleCap.y < 0 || bottleCap.y > tableHeight) &&
        !(bottleCap.x >= safeZoneX1 && bottleCap.x <= safeZoneX2 && bottleCap.y >= safeZoneY1 && bottleCap.y <= safeZoneY2)) {
        // 병뚜껑이 테이블 밖으로 나가면 점수를 NaN으로 처리하고 다음 턴으로 넘어감
        handleOutOfBounds();
        return;  // 추가적인 업데이트를 방지하기 위해 return
    }

    // 병뚜껑이 멈췄는지 확인 (병뚜껑이 속도가 매우 느리고 멈춘 상태이면 처리)
    if (!isDragging && bottleCap.body.speed < 15 && !isBottleCapStopped && bottleCap.body.velocity.length() > 0) {
        // 병뚜껑이 테이블 안에 있고 멈추면 정상 처리
        isBottleCapStopped = true;
        endSound.play();

        // 2초 후에 다음 턴으로 넘어가는 타이머 설정
        setTimeout(() => {
            handleBottleCapAction();  // 병뚜껑이 멈춘 후 기록 갱신 및 처리
            if (triesLeft <= 0) {
                endGame();  // 남은 병뚜껑이 없으면 게임 종료
            }
        }, 1000);  // 2초 후에 다음 턴으로 넘어감
    }
}

function updateCapsUI() {
    const selectedCap = localStorage.getItem('selectedCap');  // 선택된 병뚜껑 이미지 경로
    let caps = document.querySelectorAll(".cap-icon");  // 남은 병뚜껑 아이콘들

    // 병뚜껑 이미지 설정
    caps.forEach((capIcon) => {
        capIcon.src = selectedCap;  // 선택된 병뚜껑 이미지로 아이콘 변경
    });

    // 남은 병뚜껑의 개수보다 많은 병뚜껑 아이콘이 있다면 숨김 처리
    if (triesLeft >= 0 && triesLeft < caps.length) {
        caps[caps.length - triesLeft - 1].style.visibility = 'hidden';
    }
}


function updateBestScoreUI() {
    console.log(highestScore);
    document.getElementById("best-score").textContent = `${highestScore.toFixed(3)} cm`;
}

// 낙 처리 범위를 확인하는 함수
function checkOutOfBounds() {
    let safeZoneX1 = 0; // 안전 구역의 왼쪽 X 좌표 (왼쪽 끝까지 허용)
    let safeZoneX2 = 1000; // 안전 구역의 오른쪽 X 좌표
    let safeZoneY1 = tableHeight; // 안전 구역의 상단 Y 좌표
    let safeZoneY2 = tableHeight + 1000; // 안전 구역의 하단 Y 좌표

    // 병뚜껑이 안전 구역 내에 있으면 낙 처리하지 않음
    if (bottleCap.x >= safeZoneX1 && bottleCap.x <= safeZoneX2 && bottleCap.y >= safeZoneY1 && bottleCap.y <= safeZoneY2) {
        return false; // 안전 구역 안에 있으면 낙 처리하지 않음
    }

    // 그 외의 경우 낙 처리
    return true;
}

// 병뚜껑 초기화
function resetBottleCap(success) {
    document.getElementById('current-distance').innerText = '0 cm';
    if (triesLeft <= 0) {
        endGame();  // 남은 병뚜껑이 없으면 게임 종료
    } else {
        bottleCap.setPosition(slingshotAnchorX - 100, bottleCapOriginalY);  // 초기 위치로 이동
        bottleCap.body.setVelocity(0, 0);  // 속도 초기화
        bottleCap.setAngularVelocity(0);  // 회전 멈춤
        bottleCap.setRotation(0);  // 회전 각도를 초기화
        isBottleCapStopped = false;
        isDragging = false;
        bottleCap.setInteractive();
        camera.startFollow(bottleCap);  // 카메라 재설정
    }
}

function endGame() {
    gameOver = true;  // 게임 종료 플래그 설정

    // 남은 병뚜껑 UI 업데이트 (마지막 병뚜껑을 숨기기)
    updateCapsUI();

    // 병뚜껑을 다시 드래그할 수 없도록 비활성화
    bottleCap.disableInteractive();  
    camera.stopFollow();  // 카메라 멈춤

    // localStorage에서 저장된 studentId 가져오기
    const studentId = localStorage.getItem('studentId');

    if (studentId) {
        updateHighestScore(studentId, highestScore).then(() => {
            // 게임이 끝나면 hasPlayed 값을 true로 업데이트
            updateHasPlayed(studentId);
        });
    } else {
        console.error("studentId가 없습니다. 게임 시작 전에 학번을 저장했는지 확인하세요.");
    }

    // 2초 후에 result.html로 이동
    setTimeout(function() {
        window.location.href = 'result.html';
    }, 2000);  // 2초 동안 대기 후 페이지 이동
}


// 병뚜껑이 테이블 밖으로 나갔을 때 처리하는 함수
function handleOutOfBounds() {
    // 병뚜껑 개수 줄이기
    triesLeft -= 1;
    fallSound.play()

    // 기록을 0으로 초기화
    document.getElementById('current-distance').innerText = '0 cm'; 

    // 병뚜껑 아이콘 업데이트
    let capIcon = document.getElementById(`cap${triesLeft + 1}`);
    if (capIcon) {
        capIcon.style.visibility = 'hidden';  // 병뚜껑 아이콘 숨기기
    }

    // 낙구 시 가장 큰 값을 설정하지만, 최고 기록이 이미 갱신된 경우 그대로 유지
    let outOfBoundsScore = 10000;  // 낙구 시 점수, 큰 값으로 설정
    
    if (highestScore === 0 || (highestScore >= 10000 && triesLeft === 2)) {
        highestScore = outOfBoundsScore;
    }

    // HTML에서 최고 기록을 업데이트
    document.getElementById('best-score').innerText = `${highestScore.toFixed(3)} cm`;

    // 다음 턴으로 넘어가기 위해 병뚜껑 초기화
    resetBottleCap(false);

    // 병뚜껑 개수가 0이 되었을 때 게임 종료
    if (triesLeft <= 0) {
        endGame();  // 병뚜껑 시도가 모두 끝나면 게임 종료
    }
}

function updateSlingshotLine(endX, endY) {
    slingshotLine.clear();
    slingshotLine.lineStyle(4, 0xea9f0c, 1);
    
    // 병뚜껑의 위치에 따라 고무줄의 끝점을 병뚜껑 중심부로 조정
    slingshotLine.lineBetween(slingshotAnchorX - 200, slingshotAnchorY, endX, endY);  // 왼쪽 고무줄
    slingshotLine.lineBetween(slingshotAnchorX + 0, slingshotAnchorY, endX, endY);  // 오른쪽 고무줄
}
// app.js 파일의 끝 부분에 추가
export{startPhaserGame};