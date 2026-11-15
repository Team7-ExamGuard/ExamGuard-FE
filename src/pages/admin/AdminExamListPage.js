import { Link } from "react-router-dom";

// TODO(6단계): 시험 표(제목·상태 배지·코드·시작/종료·입장 인원), 행 클릭 시 상태별 이동
export default function AdminExamListPage() {
  return (
    <main className="page">
      <div className="page-head">
        <h1>시험 목록</h1>
        <Link to="/admin/exams/new" className="btn btn-primary">
          새 시험 만들기
        </Link>
      </div>
      <p className="placeholder">시험 목록 표가 들어갈 자리</p>
      <ul className="temp-links">
        <li><Link to="/admin/exams/1/edit">(임시) DRAFT 시험 1 편집</Link></li>
        <li><Link to="/admin/exams/2">(임시) OPEN 시험 2 현황</Link></li>
      </ul>
    </main>
  );
}
