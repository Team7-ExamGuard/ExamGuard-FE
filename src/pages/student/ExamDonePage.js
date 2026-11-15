import { Link, useParams } from "react-router-dom";

// TODO(5단계): 제출 시각 표시
export default function ExamDonePage() {
  const { examId } = useParams();
  return (
    <main className="page">
      <h1>제출 완료</h1>
      <p className="placeholder">시험 {examId} 제출 완료 메시지와 제출 시각이 들어갈 자리</p>
      <Link to="/exam/join" className="btn btn-primary">
        다른 시험 코드 입력
      </Link>
    </main>
  );
}
