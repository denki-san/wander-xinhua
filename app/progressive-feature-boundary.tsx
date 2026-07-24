"use client";

import { Component, type ReactNode } from "react";

export class ProgressiveFeatureBoundary extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
    resetKey?: string | number;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: Readonly<{ resetKey?: string | number }>) {
    if (
      this.state.failed
      && previous.resetKey !== this.props.resetKey
    ) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
