import React from 'react';
import { Button } from '@/components/ui/button';

export class RouteBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section role="alert" className="p-6">
      <p>โหลดหน้านี้ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วโหลดใหม่</p>
      <Button onClick={() => window.location.reload()}>โหลดหน้าใหม่</Button>
    </section>;
    return this.props.children;
  }
}
