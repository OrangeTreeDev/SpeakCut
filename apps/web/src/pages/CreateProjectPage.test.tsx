import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CreateProjectPage } from "./CreateProjectPage";

describe("CreateProjectPage", () => {
  it("renders creation form", () => {
    render(
      <MemoryRouter>
        <CreateProjectPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("把文字变成大片")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /创建/ })).toBeInTheDocument();
  });
});
