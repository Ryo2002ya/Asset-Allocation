"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type DataRow = Record<string, string | number>;

export default function Home() {
  const [fileList, setFileList] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [xAxis, setXAxis] = useState<string | null>(null);
  const [yAxis, setYAxis] = useState<string | null>(null);

  // 公開ディレクトリのファイル一覧を取得（手動で定義）
  useEffect(() => {
    // 公開ファイル一覧を手動定義（またはAPI経由で取得）
    setFileList(["example1.csv", "example2.csv"]);
  }, []);

  const fetchCsv = async (filename: string) => {
    const res = await fetch(`/data/${filename}`);
    const text = await res.text();
    const rows = text.trim().split("\n").map(row => row.split(","));
    const headers = rows[0];
    const dataObjects = rows.slice(1).map(row => {
      const obj: DataRow = {};
      headers.forEach((h, i) => {
        const value = row[i];
        const num = parseFloat(value);
        obj[h] = isNaN(num) ? value : num;
      });
      return obj;
    });
    setData(dataObjects);
    setColumns(headers);
    setXAxis(headers[0]);
    setYAxis(headers[1]);
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">CSV 可視化サイト</h1>

      <div className="mb-4">
        <label className="block font-medium mb-1">ファイル選択</label>
        <select
          onChange={(e) => {
            const filename = e.target.value;
            setSelectedFile(filename);
            fetchCsv(filename);
          }}
          value={selectedFile ?? ""}
          className="border p-2 rounded w-full max-w-md"
        >
          <option value="">--- CSV ファイルを選んでください ---</option>
          {fileList.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>

      {data.length > 0 && (
        <Tabs defaultValue="chart" className="mt-6">
          <TabsList>
            <TabsTrigger value="chart">グラフ表示</TabsTrigger>
            <TabsTrigger value="table">統計表示</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div className="flex gap-4 my-4">
              <div>
                <label className="block mb-1">X軸</label>
                <select
                  value={xAxis ?? ""}
                  onChange={(e) => setXAxis(e.target.value)}
                  className="border p-2 rounded"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1">Y軸</label>
                <select
                  value={yAxis ?? ""}
                  onChange={(e) => setYAxis(e.target.value)}
                  className="border p-2 rounded"
                >
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data}>
                <XAxis dataKey={xAxis!} />
                <YAxis />
                <Tooltip />
                <Bar dataKey={yAxis!} fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardContent className="overflow-x-auto p-4">
                <table className="min-w-full border">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="border px-2 py-1 text-left bg-gray-100">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, idx) => (
                      <tr key={idx}>
                        {columns.map((col) => (
                          <td key={col} className="border px-2 py-1">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
