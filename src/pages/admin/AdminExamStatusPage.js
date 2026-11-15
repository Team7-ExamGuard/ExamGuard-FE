import { Link, useParams } from "react-router-dom";

// TODO(6단계): 시험 코드 크게+복사, 남은 시간, 요약 카드 4개, 학생 표+필터, 5초 폴링, 조기 종료
export default function AdminExamStatusPage() {
  const { examId } = useParams();
  return (
    <main className="page">
      <h1>시험 {examId} 현황</h1>
      <p className="placeholder">시험 코드, 요약 카드, 학생 표가 들어갈 자리</p>
      <Link to="/admin/exams" className="btn btn-ghost">
        목록으로
      </Link>
    </main>
  );
}
