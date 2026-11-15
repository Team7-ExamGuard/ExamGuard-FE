import { useNavigate } from "react-router-dom";

// TODO(5단계): 시험 코드 입력, 에러 4종 구분, 성공 시 wait로 이동
export default function ExamJoinPage() {
  const navigate = useNavigate();
  return (
    <main className="page">
      <h1>시험 코드 입력</h1>
      <p className="placeholder">시험 코드 입력창과 입장 버튼이 들어갈 자리</p>
      <button className="btn btn-primary" onClick={() => navigate("/exam/1/wait")}>
        (임시) 시험 1 입장
      </button>
    </main>
  );
}
