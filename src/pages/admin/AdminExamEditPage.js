import { Link, useParams } from "react-router-dom";

// TODO(6단계): 기본 정보 폼, 문항 목록, 문항 편집 모달, 임시 저장 / 공개하기
export default function AdminExamEditPage() {
  const { examId } = useParams();
  const isNew = !examId;
  return (
    <main className="page">
      <h1>{isNew ? "새 시험 만들기" : `시험 ${examId} 편집`}</h1>
      <p className="placeholder">기본 정보와 문항 목록이 들어갈 자리</p>
      <Link to="/admin/exams" className="btn btn-ghost">
        목록으로
      </Link>
    </main>
  );
}
